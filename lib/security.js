var fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    Q = require('q'),
    request = require('request'),
    Utils = require('./utils'),
    settings = require('./settings'),
    logging = require('./logging');

var Security = module.exports;

Security.addProfile = function(appId, jar, name) {
  var q = Q.defer();

  request.post({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/security/profiles/',
    // qs: {"app_id": appId},
    // useQuerystring: true,
    proxy: process.env.PROXY || process.env.http_proxy || null,
    formData: {
      'name': name,
      'tag': name.toLowerCase().replace(/\s/g, '_').replace(/[^a-z_]/g, '')
    },
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
      return q.reject(JSON.parse(body).error);
    }

    if (response.statusCode != 201) {
      logging.logger.error("Body:", body);
      return q.reject("Error in security service.");
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
      return q.reject("Error in security service.");
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

    if (response.statusCode == 404) {
      return q.reject("Security profile not found.");
    }

    if (response.statusCode != 200) {
      logging.logger.error("Body:", body);
      return q.reject("Error in security service.");
    }

    q.resolve(JSON.parse(body));
  });

  return q.promise;
};

Security.addAndroidCredentials = function(appId, jar, profileTag, keystoreFileStream, keystorePassword, keyAlias, keyPassword) {
  return sendCredentials(appId, jar, profileTag, {
    'type': 'android',
    'keystore_file': keystoreFileStream,
    'keystore_password': keystorePassword,
    'key_alias': keyAlias,
    'key_password': keyPassword
  });
};

Security.addIOSCredentials = function(appId, jar, profileTag, certificateFileStream, certificatePassword, provisioningProfileFileStream) {
  return sendCredentials(appId, jar, profileTag, {
    'type': 'ios',
    'cert_file': certificateFileStream,
    'cert_password': certificatePassword,
    'provisioning_profile_file': provisioningProfileFileStream
  });
};

function sendCredentials(appId, jar, profileTag, formData) {
  var q = Q.defer();

  request.post({
    url: settings.IONIC_DASH_API + 'apps/' + appId + '/security/profiles/' + profileTag + '/credentials/',
    // qs: {"app_id": appId},
    // useQuerystring: true,
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
      return q.reject(JSON.parse(body).error);
    }

    if (response.statusCode != 201) {
      logging.logger.error("Body:", body);
      return q.reject("Error in security service.");
    }

    return q.resolve(JSON.parse(body));
  });

  return q.promise;
}
