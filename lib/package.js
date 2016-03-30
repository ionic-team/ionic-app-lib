var fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    Q = require('q'),
    archiver = require('archiver'),
    request = require('request'),
    requestProgess = require('request-progress'),
    Security = require('./security'),
    Upload = require('./upload'),
    events = require('./events'),
    IonicResources = require('./resources'),
    Utils = require('./utils'),
    settings = require('./settings'),
    log = require('./logging').logger;

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

Package.buildAndroidDebug = function(appDirectory, jar, appId) {
  return build(appDirectory, jar, appId, undefined, {
    platform: 'android',
    build_mode: 'debug'
  });
};

Package.buildAndroidRelease = function(appDirectory, jar, appId, profile) {
  return build(appDirectory, jar, appId, profile, {
    platform: 'android',
    build_mode: 'release'
  });
};

Package.buildIOS = function(appDirectory, jar, appId, profile, buildMode) {
  return build(appDirectory, jar, appId, profile, {
    platform: 'ios',
    build_mode: buildMode
  });
};

Package.listBuilds = function(appId, jar) {
  var q = Q.defer();

  request.get({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/package/builds/',
    qs: {"app_id": appId},
    useQuerystring: true,
    proxy: process.env.PROXY || process.env.http_proxy || null,
    headers: {
      cookie: jar.map(function(c) {
        return c.key + "=" + encodeURIComponent(c.value);
      }).join("; "),
      'X_CSRFToken': Utils.retrieveCsrfToken(jar),
      'Content-Type': 'application/json'
    }
  }, function(err, response, body) {
    if (err) {
      log.error("Error:", err);
      return q.reject(err);
    }

    if (response.statusCode != 200) {
      log.error("Body:", body);
      return q.reject("Error in package service.");
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
    qs: _.extend({"app_id": appId}, extraQueryParams),
    useQuerystring: true,
    proxy: process.env.PROXY || process.env.http_proxy || null,
    headers: {
      cookie: jar.map(function(c) {
        return c.key + "=" + encodeURIComponent(c.value);
      }).join("; "),
      'X_CSRFToken': Utils.retrieveCsrfToken(jar),
      'Content-Type': 'application/json'
    }
  }, function(err, response, body) {
    if (err) {
      log.error("Error:", err);
      return q.reject(err);
    }

    if (response.statusCode != 200) {
      log.error("Body:", body);
      return q.reject("Error in package service.");
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
};

Package.downloadBuild = function(appId, jar, buildId, downloadDir) {
  return Package.getBuild(appId, jar, buildId, {'fields': ['url']})
    .then(function(body) {
      var q = Q.defer(),
          build = body.data,
          filename,
          filepath;

      if (build.status != 'SUCCESS' || !build.url) {
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
}

function build(appDirectory, jar, appId, profileTag, formDataExtra) {
  events.emit('package-start');

  var uploadUrl,
      projectZipPath,
      projectZipId,
      promise;

  if (typeof profileTag === 'undefined') {
    promise = Q();
  } else {
    promise = Security.getProfile(appId, jar, profileTag)
      .then(function(body) {
        if (typeof body.data.credentials[formDataExtra.platform] === 'undefined') {
          return Q.reject('Selected security profile does not have credentials for the selected platform.');
        }
      }, function(err) {
        log.error(err);
      });
  }

  return promise
    .then(function() {
      log.info("Uploading your app to Ionic...");
      return Upload.doUpload(appDirectory, jar, 'Ionic Package Upload');
    })
    .then(function(upload) {
      if (!upload || typeof upload !== 'object' || !upload.url) {
        return Q.reject('Unexpected response format: ' + upload);
      }

      events.emit('package-post-upload');
      log.info("Upload complete!");

      uploadUrl = upload.url;
    })
    .then(function(url) {
      return IonicResources.generate(appDirectory, { default: true, platforms: ['all'] });
    })
    .then(null, function(err) {
      if (err !== 'RESOURCES_EXISTS') {
        return Q.reject(err);
      }
    })
    .then(function(url) {
      events.emit('package-post-default-resources');
      log.info('Preparing your resources...');
      events.emit('package-pre-prepare-resources');
      return IonicResources.generate(appDirectory, { platforms: ['all'] });
    })
    .then(function() {
      var q = Q.defer(),
          zipFilename = 'project.zip',
          files = [
            'config.xml',
            'package.json',
            // 'hooks/**',
            IonicResources.Settings.resourceDir + '/**'
          ];

      events.emit('package-post-prepare-resources');

      for (var i in files) {
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
          if (e.code == 'ENOENT') {
            return Q.reject("The '" + f + "' file or directory does not exist, and package requires it.");
          } else {
            return Q.reject(e);
          }
        }
      }

      var zip = fs.createWriteStream(zipFilename),
          archive = archiver('zip');

      archive.pipe(zip);

      archive.bulk([{
        expand: true,
        cwd: appDirectory,
        src: files
      }]);

      zip.on('close', function() {
        q.resolve(zipFilename);
      });

      archive.finalize(function(err, bytes) {
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

      log.info("Uploading your resources to Ionic...");

      return uploadProjectZip(
        body.data.presigned_post.url,
        body.data.presigned_post.fields,
        projectZipPath
      );
    })
    .then(function() {
      var formData = {
        zip_url: uploadUrl,
        project_id: projectZipId
      };

      if (typeof profileTag !== 'undefined') {
        _.extend(formData, { security_profile_tag: profileTag });
      }

      log.info("Submitting your app to Ionic Package...");

      return sendToPackageService(appId, jar, _.extend(formData, formDataExtra));
    })
    .then(function(body) {
      events.emit('package-post-submit');
      log.info("Your app has been successfully submitted to Ionic Package!".green);
      log.info('Build ID:', body.data.id);
      log.info("We are now packaging your app.");

      fs.unlinkSync(projectZipPath);

      return body.data.id;
    });
}

function sendProjectZip(appId, jar) {
  var q = Q.defer();

  request.post({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/package/projects/',
    qs: {"app_id": appId},
    useQuerystring: true,
    proxy: process.env.PROXY || process.env.http_proxy || null,
    headers: {
      cookie: jar.map(function(c) {
        return c.key + "=" + encodeURIComponent(c.value);
      }).join("; "),
      'X_CSRFToken': Utils.retrieveCsrfToken(jar),
      'Content-Type': 'application/json'
    }
  }, function (err, response, body) {
    if (err) {
      log.error("Error:", err);
      return q.reject(err);
    }

    if (response.statusCode != 200) {
      log.error("Body:", body);
      return q.reject("Error in package service.");
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
}

function uploadProjectZip(url, formData, projectZipPath) {
  var q = Q.defer();

  _.extend(formData, {
    file: fs.createReadStream(projectZipPath)
  })

  request.post({
    url: url,
    formData: formData,
    proxy: process.env.PROXY || process.env.http_proxy || null
  }, function(err, response, body) {
    if (err) {
      log.error("Error:", err);
      return q.reject(err);
    }

    if (response.statusCode != 204) {
      log.error("Body:", body);
      return q.reject("Error in package service.");
    }

    return q.resolve();
  });

  return q.promise;
}

function sendToPackageService(appId, jar, formData) {
  var q = Q.defer();

  request.post({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/package/builds/',
    qs: {"app_id": appId},
    useQuerystring: true,
    formData: formData,
    proxy: process.env.PROXY || process.env.http_proxy || null,
    headers: {
      cookie: jar.map(function(c) {
        return c.key + "=" + encodeURIComponent(c.value);
      }).join("; "),
      'X_CSRFToken': Utils.retrieveCsrfToken(jar),
      'Content-Type': 'application/json'
    }
  }, function(err, response, body) {
    if (err) {
      log.error("Error:", err);
      return q.reject(err);
    }

    if (response.statusCode == 400) {
      log.error("Body:", body);
      return q.reject("Bad request to package service.");
    }

    if (response.statusCode != 202) {
      log.error("Body:", body);
      return q.reject("Error in package service.");
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
}
