var fs = require('fs'),
    _ = require('underscore'),
    Q = require('q'),
    request = require('request'),
    Upload = require('./upload'),
    State = require('./state'),
    events = require('./events'),
    ConfigXml = require('./config-xml'),
    IonicProject = require('./project'),
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

Package.packageAndroidDebug = function(appId, appDirectory, jar) {
  return doPackage(appId, appDirectory, jar, {
    platform: 'android',
    build_mode: 'debug'
  });
};

Package.packageAndroidRelease = function(appId, appDirectory, jar, keystoreFileStream, keystorePassword, keyAlias, keyPassword) {
  return doPackage(appId, appDirectory, jar, {
    platform: 'android',
    build_mode: 'release',
    keystore_file: keystoreFileStream,
    keystore_password: keystorePassword,
    key_alias: keyAlias,
    key_password: keyPassword
  });
};

Package.packageIOS = function(appId, appDirectory, jar, buildMode, certificateFileStream, certificatePassword, provisioningProfileFileStream) {
  return doPackage(appId, appDirectory, jar, {
    platform: 'ios',
    build_mode: buildMode,
    certificate_file: certificateFileStream,
    certificate_password: certificatePassword,
    mobile_provision_file: provisioningProfileFileStream
  });
};

function doPackage(appId, appDirectory, jar, formDataExtra) {
  // var q = Q.defer();

  logging.logger.info("Uploading your app to Ionic...");
  events.emit('package-start');

  return Upload.doUpload(appDirectory, jar, 'Ionic Package Upload')
    .then(function(upload) {
      if (!upload || typeof upload !== 'object' || !upload.url) {
        throw new Error('Unexpected response format: ' + upload);
      }

      events.emit('package-post-upload');
      logging.logger.info("Upload complete!");

      var project = IonicProject.load(appDirectory),
          configFileStream = ConfigXml.loadToStream(appDirectory),
          packageFileStream = State.getPackageJsonReadStream(appDirectory),
          formData = {
            zip_url: upload.url,
            config_file: configFileStream,
            package_file: packageFileStream
          };

      return sendToPackageService(_.extend(formData, formDataExtra));
    })
    .then(function(body) {
      events.emit('package-post-submit');
      logging.logger.info("Your app has been successfully submitted to Ionic Package!".green);
      logging.logger.info('Build ID:', body.data.build_id);
      logging.logger.info("We are now packaging your app.");
      // return q.resolve(body.data.build_id);
      return body.data.build_id;
    })
    .catch(function(ex) {
      events.emit('package-error', ex);
      logging.logger.error("Error:", ex.stack);
      throw ex;
    });

  // return q.promise;
};

function sendToPackageService(formData) {
  var q = Q.defer();

  logging.logger.info("Submitting your app to Ionic Package...");

  request.post({
    url: settings.IONIC_API + '/package',
    formData: formData,
    proxy: process.env.PROXY || process.env.http_proxy || null
  }, function(err, response, body) {
    if (err) {
      logging.logger.error("Error:", err);
      return q.reject("Error: " + err);
    }

    if (response.statusCode != 202) {
      logging.logger.error("Body:", body);
      return q.reject("Error in package service.");
    }

    try {
      return q.resolve(JSON.parse(body));
    } catch (ex) {
      logging.logger.error("Error parsing body:", ex);
      logging.logger.error("Body:", body);
      return q.reject("Error: " + ex);
    }
  });

  return q.promise;
}
