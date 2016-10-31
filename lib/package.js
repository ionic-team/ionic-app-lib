var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var Q = require('q');
var archiver = require('archiver');
var request = require('request');
var requestProgess = require('request-progress');
var Security = require('./security');
var Upload = require('./upload');
var events = require('./events');
var IonicResources = require('./resources');
var Utils = require('./utils');
var settings = require('./settings');
var log = require('./logging').logger;
var chalk = require('chalk');

var Package = module.exports;

events.on('package-start', function() {
  var logLevel = log.level;
  log.level = 'error';

  events.on('package-post-default-resources', function() {
    log.level = logLevel;
  });

  events.on('package-pre-prepare-resources', function() {
    log.level = 'error';
  });

  events.on('package-post-prepare-resources', function() {
    log.level = logLevel;
  });

});

Package.buildAndroidDebug = function(appDirectory, jar, appId, options) {
  return build(appDirectory, jar, appId, undefined, {
    platform: 'android',
    build_mode: 'debug' // eslint-disable-line camelcase
  }, options);
};

Package.buildAndroidRelease = function(appDirectory, jar, appId, profile, options) {
  return build(appDirectory, jar, appId, profile, {
    platform: 'android',
    build_mode: 'release' // eslint-disable-line camelcase
  }, options);
};

Package.buildIOS = function(appDirectory, jar, appId, profile, buildMode, options) {
  return build(appDirectory, jar, appId, profile, {
    platform: 'ios',
    build_mode: buildMode // eslint-disable-line camelcase
  }, options);
};

Package.listBuilds = function(appId, jar) {
  var q = Q.defer();

  request.get({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/package/builds/',
    qs: { app_id: appId }, // eslint-disable-line camelcase
    useQuerystring: true,
    proxy: Utils.getProxy(),
    headers: {
      cookie: jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; '),
      X_CSRFToken: Utils.retrieveCsrfToken(jar), // eslint-disable-line camelcase
      'Content-Type': 'application/json'
    }
  }, function(err, response, body) {
    if (err) {
      log.error('Error:', err);
      return q.reject(err);
    }

    if (parseInt(response.statusCode, 10) !== 200) {
      log.error('Body:', body);
      return q.reject('Error in package service.');
    }

    q.resolve(JSON.parse(body));
  });

  return q.promise;
};

Package.getBuild = function(appId, jar, buildId, extraQueryParams) {
  var q = Q.defer();
  extraQueryParams = extraQueryParams || {};

  request.get({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/package/builds/' + buildId,
    qs: _.extend({ app_id: appId }, extraQueryParams), // eslint-disable-line camelcase
    useQuerystring: true,
    proxy: Utils.getProxy(),
    headers: {
      cookie: jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; '),
      X_CSRFToken: Utils.retrieveCsrfToken(jar), // eslint-disable-line camelcase
      'Content-Type': 'application/json'
    }
  }, function(err, response, body) {
    if (err) {
      log.error('Error:', err);
      return q.reject(err);
    }

    if (parseInt(response.statusCode, 10) !== 200) {
      log.error('Body:', body);
      return q.reject('Error in package service.');
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
};

Package.downloadBuild = function(appId, jar, buildId, downloadDir) {
  return Package.getBuild(appId, jar, buildId, { fields: ['url'] })
    .then(function(body) {
      var q = Q.defer();
      var build = body.data;
      var filename;
      var filepath;

      if (build.status !== 'SUCCESS' || !build.url) {
        return Q.reject(new Error('Cannot download! Build "' + buildId + '" did not finish.'));
      }

      filename = build.name + '.' + Package.determineFileExtensionByPlatform(build.platform);
      filepath = path.join(downloadDir, filename);

      requestProgess(request({ url: build.url }))
        .on('progress', function(state) {
          q.notify(state);
        })
        .on('error', function(err) {
          q.reject(err);
        })
        .pipe(fs.createWriteStream(filepath))
        .on('error', function(err) {
          q.reject(err);
        })
        .on('close', function() {
          q.resolve(filepath);
        });

      return q.promise;
    });
};

Package.determineFileExtensionByPlatform = function(platform) {
  switch (platform) {
  case 'android':
    return 'apk';
  case 'ios':
    return 'ipa';
  }

  throw new Error('Unknown platform: ' + platform);
};

function build(appDirectory, jar, appId, profileTag, formDataExtra, options) {
  events.emit('package-start');

  var uploadUrl;
  var projectZipPath;
  var projectZipId;
  var promise;

  if (typeof profileTag === 'undefined') {
    promise = Q();
  } else {
    promise = Security.getProfile(appId, jar, profileTag)
      .then(function(body) {
        if (typeof body.data.credentials[formDataExtra.platform] === 'undefined') {
          return Q.reject('Selected security profile does not have credentials for the selected platform.');
        }
      }, function(err) {
        return Q.reject(err);
      });
  }

  return promise
    .then(function() {
      log.info('Uploading your app to Ionic...');
      return Upload.doUpload(appDirectory, jar, 'Ionic Package Upload');
    })
    .then(function(upload) {
      if (!upload || typeof upload !== 'object' || !upload.url) {
        return Q.reject('Unexpected response format: ' + upload);
      }

      events.emit('package-post-upload');
      log.info('Upload complete!');

      uploadUrl = upload.url;
    })
    .then(function() {
      if (typeof options.noresources === 'undefined') {
        return IonicResources.generate(appDirectory, { default: true, platforms: ['all'] });
      }
    })
    .then(null, function(err) {
      if (err !== 'RESOURCES_EXISTS') {
        return Q.reject(err);
      }
    })
    .then(function() {
      if (typeof options.noresources === 'undefined') {
        events.emit('package-post-default-resources');
        log.info('Preparing your resources...');
        events.emit('package-pre-prepare-resources');
        return IonicResources.generate(appDirectory, { platforms: ['all'] });
      }
    })
    .then(function() {
      var q = Q.defer();
      var zipFilename = 'project.zip';
      var files = [
        'config.xml',
        'package.json',
        IonicResources.Settings.resourceDir + '/**'
      ];

      events.emit('package-post-prepare-resources');

      for (var i in files) {
        if (files.hasOwnProperty(i)) {
          var f;
          var pos = files[i].indexOf('/');
          if (pos >= 0) {
            f = files[i].substring(0, pos);
          } else {
            f = files[i];
          }

          try {
            fs.statSync(path.join(appDirectory, f));
          } catch (e) {
            if (e.code === 'ENOENT') {
              return Q.reject("The '" + f + "' file or directory does not exist, and package requires it.");
            } else {
              return Q.reject(e);
            }
          }
        }
      }

      var zip = fs.createWriteStream(zipFilename);
      var archive = archiver('zip');

      archive.pipe(zip);

      archive.bulk([{
        expand: true,
        cwd: appDirectory,
        src: files
      }]);

      zip.on('close', function() {
        q.resolve(zipFilename);
      });

      archive.finalize(function(err) {
        if (err) {
          q.reject('Error while creating project zip: ' + err);
        }
      });

      return q.promise;
    })
    .then(function(zipPath) {
      projectZipPath = zipPath;

      return sendProjectZip(appId, jar);
    })
    .then(function(body) {
      projectZipId = body.data.id;

      log.info('Uploading your project to Ionic...');

      return uploadProjectZip(
        body.data.presigned_post.url,
        body.data.presigned_post.fields,
        projectZipPath
      );
    })
    .then(function() {
      var formData = {
        zip_url: uploadUrl, // eslint-disable-line camelcase
        project_id: projectZipId // eslint-disable-line camelcase
      };

      if (typeof profileTag !== 'undefined') {
        _.extend(formData, { security_profile_tag: profileTag }); // eslint-disable-line camelcase
      }

      log.info('Submitting your app to Ionic Package...');

      return sendToPackageService(appId, jar, _.extend(formData, formDataExtra));
    })
    .then(function(body) {
      var buildId = body.data.id;

      events.emit('package-post-submit');
      log.info(chalk.green('Your app has been successfully submitted to Ionic Package!'));
      log.info('Build ID:', buildId);
      log.info('We are now packaging your app.');

      fs.unlinkSync(projectZipPath);

      return buildId;
    });
}

function sendProjectZip(appId, jar) {
  var q = Q.defer();

  request.post({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/package/projects/',
    qs: { app_id: appId }, // eslint-disable-line camelcase
    useQuerystring: true,
    proxy: Utils.getProxy(),
    headers: {
      cookie: jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; '),
      X_CSRFToken: Utils.retrieveCsrfToken(jar), // eslint-disable-line camelcase
      'Content-Type': 'application/json'
    }
  }, function(err, response, body) {
    if (err) {
      log.error('Error:', err);
      return q.reject(err);
    }

    if (parseInt(response.statusCode, 10) !== 200) {
      log.error('Body:', body);
      return q.reject('Error in package service.');
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
}

function uploadProjectZip(url, formData, projectZipPath) {
  var q = Q.defer();

  _.extend(formData, {
    file: fs.createReadStream(projectZipPath)
  });

  request.post({
    url: url,
    formData: formData,
    proxy: Utils.getProxy()
  }, function(err, response, body) {
    if (err) {
      log.error('Error:', err);
      return q.reject(err);
    }

    if (parseInt(response.statusCode, 10) !== 204) {
      log.error('Body:', body);
      return q.reject('Error in package service.');
    }

    return q.resolve();
  });

  return q.promise;
}

function sendToPackageService(appId, jar, formData) {
  var q = Q.defer();

  request.post({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/package/builds/',
    qs: { app_id: appId }, // eslint-disable-line camelcase
    useQuerystring: true,
    formData: formData,
    proxy: Utils.getProxy(),
    headers: {
      cookie: jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; '),
      X_CSRFToken: Utils.retrieveCsrfToken(jar), // eslint-disable-line camelcase
      'Content-Type': 'application/json'
    }
  }, function(err, response, body) {
    if (err) {
      log.error('Error:', err);
      return q.reject(err);
    }

    if (parseInt(response.statusCode, 10) === 400) {
      log.error('Body:', body);
      return q.reject('Bad request to package service.');
    }

    if (parseInt(response.statusCode, 10) !== 202) {
      log.error('Body:', body);
      return q.reject('Error in package service.');
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
}
