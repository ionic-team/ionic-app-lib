var parseUrl = require('url').parse;
var Q = require('q');
var FormData = require('form-data');
var Utils = require('./utils');
var IonicProject = require('./project');
var Settings = require('./settings');
var log = require('./logging').logger;

var Share = module.exports;

Share.shareApp = function shareApp(appDirectory, jar, email) {

  var q = Q.defer();

  var project = IonicProject.load(appDirectory);

  var url = Settings.IONIC_DASH_API + 'app/' + project.get('app_id') + '/share';
  var params = parseUrl(url);

  var form = new FormData();
  form.append('csrfmiddlewaretoken', Utils.retrieveCsrfToken(jar));
  form.append('e', email);
  form.submit({
    protocol: params.protocol,
    hostname: params.hostname,
    port: params.port,
    path: params.path,
    headers: form.getHeaders({
      cookie: jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; ')
    })
  }, function(err, response) {
    if (err) {
      return q.reject('Error sharing: ' + err);
    }
    response.on('data', function() {
      if (err || parseInt(response.statusCode, 10) !== 200) {

        // console.log(data);
        return q.reject('Error sharing: ' + err);
      }
      log.info('An invite to view your app was sent.');
      return q.resolve('An invite to view your app was sent.');
    });
  });

  return q.promise;
};
