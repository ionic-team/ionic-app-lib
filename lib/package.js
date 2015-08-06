var fs = require('fs'),
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

Package.doPackage = function(appId, appDirectory, jar, platform, buildMode) {
  logging.logger.info("Uploading your app to Ionic...");
  events.emit('package-start');

  Upload.doUpload(appDirectory, jar, 'Ionic Package Upload')
    .then(function(upload) {
      events.emit('package-post-upload');
      logging.logger.info("Upload complete!");

      var q = Q.defer(),
          project = IonicProject.load(appDirectory),
          configFileStream = ConfigXml.loadToStream(appDirectory),
          packageFileStream = State.getPackageJsonReadStream(appDirectory);

      if (upload && typeof upload === 'object' && upload.url) {
        logging.logger.info("Submitting your app to Ionic Package...");

        request.post({
          url: settings.IONIC_API + '/package',
          formData: {
            platform: platform,
            build_mode: buildMode,
            zip_url: upload.url,
            config_file: configFileStream,
            package_file: packageFileStream
          },
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
      }

      return q.promise;
    })
    .then(function(body) {
      events.emit('package-post-submit');
      logging.logger.info("Your app has been successfully submitted to Ionic Package!".green);
      logging.logger.info('Build ID:', body.data.build_id);
      logging.logger.info("We are now packaging your app.");
    })
    .catch(function(ex) {
      events.emit('package-error', ex);
      logging.logger.error("Error:", ex.stack);
      throw ex;
    });
};
