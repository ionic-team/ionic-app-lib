var Q = require('q');
var request = require('request');
var Utils = require('./utils');
var settings = require('./settings');
var log = require('./logging').logger;

var Security = module.exports;

Security.addProfile = function(appId, jar, name) {
  var q = Q.defer();

  request.post({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/security/profiles/',

    // qs: {"app_id": appId},
    // useQuerystring: true,
    proxy: Utils.getProxy(),
    formData: {
      name: name,
      tag: name.toLowerCase().replace(/\s/g, '_').replace(/[^a-z_]/g, '')
    },
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
      return q.reject(JSON.parse(body).error);
    }

    if (parseInt(response.statusCode, 10) !== 201) {
      log.error('Body:', body);
      return q.reject('Error in security service.');
    }

    q.resolve(JSON.parse(body));
  });

  return q.promise;
};

Security.listProfiles = function(appId, jar) {
  var q = Q.defer();

  request.get({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/security/profiles/',

    // qs: {"app_id": appId},
    // useQuerystring: true,
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
      return q.reject('Error in security service.');
    }

    q.resolve(JSON.parse(body));
  });

  return q.promise;
};

Security.getProfile = function(appId, jar, tag) {
  var q = Q.defer();

  request.get({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/security/profiles/' + tag + '/',

    // qs: {"app_id": appId},
    // useQuerystring: true,
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

    if (parseInt(response.statusCode, 10) === 404) {
      return q.reject('Security profile not found.');
    }

    if (parseInt(response.statusCode, 10) !== 200) {
      log.error('Body:', body);
      return q.reject('Error in security service.');
    }

    q.resolve(JSON.parse(body));
  });

  return q.promise;
};

Security.addAndroidCredentials = function(appId, jar, profileTag, keystoreFileStream,
                                          keystorePassword, keyAlias, keyPassword) {
  return sendCredentials(appId, jar, profileTag, {
    type: 'android',
    keystore_file: keystoreFileStream, // eslint-disable-line camelcase
    keystore_password: keystorePassword, // eslint-disable-line camelcase
    key_alias: keyAlias, // eslint-disable-line camelcase
    key_password: keyPassword // eslint-disable-line camelcase
  });
};

Security.addIOSCredentials = function(appId, jar, profileTag, certificateFileStream,
                                      certificatePassword, provisioningProfileFileStream) {
  return sendCredentials(appId, jar, profileTag, {
    type: 'ios',
    cert_file: certificateFileStream, // eslint-disable-line camelcase
    cert_password: certificatePassword, // eslint-disable-line camelcase
    provisioning_profile_file: provisioningProfileFileStream // eslint-disable-line camelcase
  });
};

function sendCredentials(appId, jar, profileTag, formData) {
  var q = Q.defer();

  request.post({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/security/profiles/' + profileTag + '/credentials/',

    // qs: {"app_id": appId},
    // useQuerystring: true,
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
      return q.reject(JSON.parse(body).error);
    }

    if (parseInt(response.statusCode, 10) !== 201) {
      log.error('Body:', body);
      return q.reject('Error in security service.');
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
}
