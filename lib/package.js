var fs = require('fs'),
    _ = require('underscore'),
    Q = require('q'),
    path = require('path'),
    request = require('request'),
    Upload = require('./upload'),
    State = require('./state'),
    events = require('./events'),
    ConfigXml = require('./config-xml'),
    IonicProject = require('./project'),
    Utils = require('./utils'),
    ResourceSettings = require('./resources/settings'),
    settings = require('./settings'),
    logging = require('./logging');

var Package = module.exports;

events.on('package-start', function() {
  var logLevel = logging.logger.level;
  logging.logger.level = 'error';

  events.on('package-post-upload', function() {
    logging.logger.level = logLevel;
  });
});

Package.buildAndroidDebug = function(appId, appDirectory, jar) {
  return build(appId, appDirectory, jar, {
    platform: 'android',
    build_mode: 'debug'
  });
};

Package.buildAndroidRelease = function(appId, appDirectory, jar, keystoreFileStream, keystorePassword, keyAlias, keyPassword) {
  return build(appId, appDirectory, jar, {
    platform: 'android',
    build_mode: 'release',
    keystore_file: keystoreFileStream,
    keystore_password: keystorePassword,
    key_alias: keyAlias,
    key_password: keyPassword
  });
};

Package.buildIOS = function(appId, appDirectory, jar, buildMode, certificateFileStream, certificatePassword, provisioningProfileFileStream) {
  return build(appId, appDirectory, jar, {
    platform: 'ios',
    build_mode: buildMode,
    certificate_file: certificateFileStream,
    certificate_password: certificatePassword,
    mobile_provision_file: provisioningProfileFileStream
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

Package.getBuild = function(appId, jar, buildId) {
  var q = Q.defer();

  request.get({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/package/builds/' + buildId,
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

function build(appId, appDirectory, jar, formDataExtra) {
  logging.logger.info("Uploading your app to Ionic...");
  events.emit('package-start');

  var uploadUrl;
  var resourceZipPath;

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
      return Utils.createArchive(appDirectory, ResourceSettings.ResSettings.resourceDir);
    })
    .then(function(zipPath) {
      resourceZipPath = zipPath;

      var project = IonicProject.load(appDirectory),
          configFileStream = ConfigXml.loadToStream(appDirectory),
          packageFileStream = State.getPackageJsonReadStream(appDirectory),
          resourcesZipFileStream = fs.createReadStream(resourceZipPath),
          formData = {
            zip_url: uploadUrl,
            config_file: configFileStream,
            package_file: packageFileStream,
            resources_zip_file: resourcesZipFileStream
          };

      return sendToPackageService(appId, jar, _.extend(formData, formDataExtra));
    })
    .then(function(body) {
      events.emit('package-post-submit');
      logging.logger.info("Your app has been successfully submitted to Ionic Package!".green);
      logging.logger.info('Build ID:', body.data.id);
      logging.logger.info("We are now packaging your app.");

      fs.unlinkSync(resourceZipPath);

      return body.data.id;
    });
};

function sendToPackageService(appId, jar, formData) {
  var q = Q.defer();

  logging.logger.info("Submitting your app to Ionic Package...");

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
      return q.reject("Bad request to package service. Extra: " + body.data.error.extra);
    }

    if (response.statusCode != 202) {
      logging.logger.error("Body:", body);
      return q.reject("Error in package service.");
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
}
