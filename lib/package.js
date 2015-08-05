var Q = require('q'),
    request = require('request'),
    Upload = require('./upload'),
    settings = require('./settings');

var Package = module.exports;

Package.doPackage = function(appId, appDirectory, jar, platform, buildMode) {
  Upload.doUpload(appDirectory, jar, 'Ionic Package Upload')
    .then(function(upload) {
      var q = Q.defer();

      if (upload && typeof upload === 'object' && upload.url) {
        request.post({
          url: settings.IONIC_API + '/package/package',
          formData: {
            platform: platform,
            build_mode: buildMode,
            zip_url: upload.url
          },
          proxy: process.env.PROXY || process.env.http_proxy || null
        }, function(err, response, body) {
          if (err) {
            console.log("Error:", err);
            return q.reject("Error: " + err);
          }

          if (response.statusCode != 202) {
            console.log("Error:", body);
            return q.reject("Error in package service.");
          }

          try {
            var data = JSON.parse(body);
            console.log('SUCCESS!', data);
            return q.resolve(data);
          } catch (ex) {
            console.log("Error:", ex);
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
