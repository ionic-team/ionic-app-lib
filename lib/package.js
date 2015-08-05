var fs = require('fs'),
    Q = require('q'),
    request = require('request'),
    Upload = require('./upload'),
    State = require('./state'),
    ConfigXml = require('./config-xml'),
    IonicProject = require('./project'),
    settings = require('./settings'),
    logging = require('./logging');

var Package = module.exports;

Package.doPackage = function(appId, appDirectory, jar, platform, buildMode) {
  var logLevel = logging.logger.level;
  logging.logger.level = 'error';

  Upload.doUpload(appDirectory, jar, 'Ionic Package Upload')
    .then(function(upload) {
      logging.logger.level = logLevel;

      var q = Q.defer(),
          project = IonicProject.load(appDirectory),
          configFileStream = ConfigXml.loadToStream(appDirectory),
          packageFileStream = State.getPackageJsonReadStream(appDirectory);

      if (upload && typeof upload === 'object' && upload.url) {
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
            console.log("Error:", err);
            return q.reject("Error: " + err);
          }

          if (response.statusCode != 202) {
            console.log("Body:", body);
            return q.reject("Error in package service.");
          }

          try {
            return q.resolve(JSON.parse(body));
          } catch (ex) {
            console.log("Error parsing body:", ex);
            console.log("Body:", body);
            return q.reject("Error: " + ex);
          }
        });
      }

      return q.promise;
    })
    .then(function(data) {
      console.log('second then', data);
    })
    .catch(function(ex) {
      console.log("Error:", ex.stack);
      throw ex;
    });
};
