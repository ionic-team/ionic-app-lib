var fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    Q = require('q'),
    archiver = require('archiver'),
    request = require('request'),
    requestProgess = require('request-progress'),
    Upload = require('./upload'),
    State = require('./state'),
    events = require('./events'),
    ConfigXml = require('./config-xml'),
    IonicProject = require('./project'),
    IonicResources = require('./resources'),
    Utils = require('./utils'),
    settings = require('./settings'),
    logging = require('./logging');

var Package = module.exports;

events.on('package-start', function() {
  var logLevel = logging.logger.level;
  logging.logger.level = 'error';

  events.on('package-post-default-resources', function() {
    logging.logger.level = logLevel;
  });

  events.on('package-pre-prepare-resources', function() {
    logging.logger.level = 'error';
  });

  events.on('package-post-prepare-resources', function() {
    logging.logger.level = logLevel;
  });

});

Package.buildAndroidDebug = function(appDirectory, jar, appId) {
  return build(appDirectory, jar, appId, {
    platform: 'android',
    build_mode: 'debug'
  });
};

Package.buildAndroidRelease = function(appDirectory, jar, appId, keystoreFileStream, keystorePassword, keyAlias, keyPassword) {
  return build(appDirectory, jar, appId, {
    platform: 'android',
    build_mode: 'release',
    keystore_file: keystoreFileStream,
    keystore_password: keystorePassword,
    key_alias: keyAlias,
    key_password: keyPassword
  });
};

Package.buildIOS = function(appDirectory, jar, appId, buildMode, certificateFileStream, certificatePassword, provisioningProfileFileStream) {
  return build(appDirectory, jar, appId, {
    platform: 'ios',
    build_mode: buildMode,
    certificate_file: certificateFileStream,
    certificate_password: certificatePassword,
    provisioning_profile_file: provisioningProfileFileStream
  });
};

Package.listBuilds = function(appId, jar) {
  var q = Q.defer();

  request.get({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/package/builds/',
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
      logging.logger.error("Error:", err);
      return q.reject(err);
    }

    if (response.statusCode != 200) {
      logging.logger.error("Body:", body);
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
    qs: extraQueryParams,
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
      logging.logger.error("Error:", err);
      return q.reject(err);
    }

    if (response.statusCode != 200) {
      logging.logger.error("Body:", body);
      return q.reject("Error in package service.");
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
};

Package.downloadBuild = function(appId, jar, buildId, path) {
  return Package.getBuild(appId, jar, buildId)
    .then(function(body) {
      var q = Q.defer(),
          build = body.data;

      if (build.status != 'SUCCESS' || !build.url) {
        return Q.reject(new Error('Cannot download! Build did not finish.'));
      }

      if (typeof path === 'undefined') {
        path = build.name + '.' + Package.determineFileExtensionByPlatform(build.platform);
      }

      requestProgess(request({ url: build.url }))
        .on('progress', function(state) {
          q.notify(state);
        })
        .on('error', function(err) {
          q.reject(err);
        })
        .pipe(fs.createWriteStream(path))
        .on('error', function(err) {
          q.reject(err);
        })
        .on('close', function() {
          console.log('\nWrote:', path);
          q.resolve(path);
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

function build(appDirectory, jar, appId, formDataExtra) {
  logging.logger.info("Uploading your app to Ionic...");
  events.emit('package-start');

  var uploadUrl,
      projectZipPath,
      projectZipId;

  return Upload.doUpload(appDirectory, jar, 'Ionic Package Upload')
    .then(function(upload) {
      if (!upload || typeof upload !== 'object' || !upload.url) {
        return Q.reject('Unexpected response format: ' + upload);
      }

      events.emit('package-post-upload');
      logging.logger.info("Upload complete!");

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
      logging.logger.info('Preparing your resources...');
      events.emit('package-pre-prepare-resources');
      return IonicResources.generate(appDirectory, { platforms: ['all'] });
    })
    .then(function() {
      events.emit('package-post-prepare-resources');

      var q = Q.defer(),
          zipFilename = 'project.zip',
          zip = fs.createWriteStream(zipFilename),
          archive = archiver('zip');

      archive.pipe(zip);
      archive.file('.bowerrc');
      archive.file('bower.json');
      archive.file('config.xml');
      archive.file('gulpfile.js');
      archive.file('package.json');
      archive.directory('hooks');
      archive.directory(IonicResources.Settings.resourceDir);

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

      logging.logger.info("Uploading your resources to Ionic...");

      return uploadProjectZip(
        body.data.presigned_post.url,
        body.data.presigned_post.fields,
        projectZipPath
      );
    })
    .then(function() {
    }, null, function(state) {
      console.log('state', state);
    })
    .then(function() {
      var project = IonicProject.load(appDirectory),
          formData = {
            zip_url: uploadUrl,
            project_id: projectZipId
          };

      logging.logger.info("Submitting your app to Ionic Package...");

      return sendToPackageService(appId, jar, _.extend(formData, formDataExtra));
    })
    .then(function(body) {
      events.emit('package-post-submit');
      logging.logger.info("Your app has been successfully submitted to Ionic Package!".green);
      logging.logger.info('Build ID:', body.data.id);
      logging.logger.info("We are now packaging your app.");

      fs.unlinkSync(projectZipPath);

      return body.data.id;
    });
};

function sendProjectZip(appId, jar) {
  var q = Q.defer();

  request.post({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/package/projects/',
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
      logging.logger.error("Error:", err);
      return q.reject(err);
    }

    if (response.statusCode != 200) {
      logging.logger.error("Body:", body);
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
      logging.logger.error("Error:", err);
      return q.reject(err);
    }

    if (response.statusCode != 204) {
      logging.logger.error("Body:", body);
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
      logging.logger.error("Error:", err);
      return q.reject(err);
    }

    if (response.statusCode == 400) {
      logging.logger.error("Body:", body);
      return q.reject("Bad request to package service.");
    }

    if (response.statusCode != 202) {
      logging.logger.error("Body:", body);
      return q.reject("Error in package service.");
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
}
