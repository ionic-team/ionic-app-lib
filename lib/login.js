var chalk = require('chalk');
var request = require('request');
var argv = require('optimist').argv;
var prompt = require('prompt');
var IonicStore = require('./store').IonicStore;
var Q = require('q');
var settings = require('./settings');
var Utils = require('./utils');
var log = require('./logging').logger;

var Login = module.exports;

Login.jar = null;

// Here we want to look up an existing cookie jar for login if it exists.
// If not, resolve false
Login.retrieveLogin = function retrieveLogin() {
  var q = Q.defer();

  try {
    var cookieData = new IonicStore('cookies');

    if (Login.jar) {

      // already in memory
      q.resolve(Login.jar);
      return q.promise;
    }

    // this.email = argv.email || argv.e || process.env.IONIC_EMAIL;
    // this.password = argv.password || argv.p || process.env.IONIC_PASSWORD;

    // if(!email && password) {
    //   return Utils.fail('--email or -e command line flag, or IONIC_EMAIL environment variable required');
    // }
    // if(email && !password) {
    //   return Utils.fail('--password or -p command line flag, or IONIC_PASSWORD environment variable required');
    // }

    // if(!email && !password) {
    //   // did not include cmd line flags, check for existing cookies
    var jar = cookieData.get(settings.IONIC_DASH);

    if (jar && jar.length) {
      for (var i in jar) {
        if (jar.hasOwnProperty(i)) {
          var cookie = jar[i];
          if (cookie.key === 'sessionid' && new Date(cookie.expires) > new Date()) {
            Login.jar = jar;
            q.resolve(Login.jar);
            return q.promise;
          }
        }
      }
    }

    q.resolve(false);
  } catch (ex) {
    q.reject(ex);
  }

  return q.promise;
};

Login.run = function(ionic, callback) {
  var self = this;

  if (!this.email && !this.password) {

    var schema = [{
      name: 'email',
      pattern: /^[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+(?:\.[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+)*@(?:[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?$/, // eslint-disable-line max-len
      description: chalk.yellow.bold('Email:'),
      required: true
    }, {
      name: 'password',
      description: chalk.yellow.bold('Password:'),
      hidden: true,
      required: true
    }];

    // prompt for log
    log.info('\nTo continue, please login to your Ionic account.');
    log.info(chalk.bold('Don\'t have one? Create a one at: ') + chalk.bold(settings.IONIC_DASH + '/signup') + '\n');

    prompt.override = argv;
    prompt.message = '';
    prompt.delimiter = '';
    prompt.start();

    prompt.get(schema, function(err, result) {
      if (err) {
        return Utils.fail('Error logging in: ' + err);
      }

      self.email = result.email;
      self.password = result.password;

      self.requestLogIn(ionic, callback, true);
    });

  } else {

    // cmd line flag were added, use those instead of a prompt
    self.requestLogIn(ionic, callback, false);
  }

};

Login.requestLogIn = function requestLogin(email, password, saveCookies) {
  var q = Q.defer();
  var transformedCookies = null;

  var url = [settings.IONIC_DASH_API, 'user/login'].join('');

  var jar = request.jar();

  request({
    method: 'POST',
    url: url,
    jar: jar,
    form: {
      username: email.toString(),
      password: password
    },
    proxy: Utils.getProxy()
  }, function(err, response) {
    if (err) {
      return q.reject('Error logging in: ' + err);
    }

    if (parseInt(response.statusCode, 10) !== 200) {
      return q.reject('Email or Password incorrect.');
    }

    if (saveCookies) {
      transformedCookies = Login.saveCookies(jar);
    } else {
      try {
        var jsonString = JSON.stringify(jar.getCookies(settings.IONIC_DASH, null, 2));
        transformedCookies = JSON.parse(jsonString);
      } catch (ex) {
        log.error('Invalid cookies from jar.getCookies');
      }
    }

    q.resolve(transformedCookies);
  });
  return q.promise;
};

Login.requestSignup = function requestLogin(fields, saveCookies) {
  var q = Q.defer();
  var transformedCookies = null;

  var url = [settings.IONIC_DASH_API, 'signup'].join('');
  console.log("Sign up URL", url);

  var jar = request.jar();

  request({
    method: 'POST',
    url: url,
    jar: jar,
    form: fields,
    proxy: Utils.getProxy()
  }, function(err, response, body) {
    if (err) {
      return q.reject([err, body]);
    }

    if (parseInt(response.statusCode, 10) !== 200) {
      return q.reject([response, body]);
    }

    if (saveCookies) {
      transformedCookies = Login.saveCookies(jar);
    } else {
      try {
        var jsonString = JSON.stringify(jar.getCookies(settings.IONIC_DASH, null, 2));
        transformedCookies = JSON.parse(jsonString);
      } catch (ex) {
        log.error('Invalid cookies from jar.getCookies');
      }
    }

    q.resolve(transformedCookies);

  });
  return q.promise;
};

Login.saveCookies = function saveCookies(jar) {
  var cookies = jar.getCookies(settings.IONIC_DASH);
  var cookieData;
  var transformedCookies;

  try {

    if (saveCookies) {

      // save cookies
      if (!cookieData) {
        cookieData = new IonicStore('cookies');
      }
      cookieData.set(settings.IONIC_DASH, cookies);
      cookieData.save();

      transformedCookies = cookieData.get(settings.IONIC_DASH);
    } else {
      var jsonString = JSON.stringify(jar.getCookies(settings.IONIC_DASH, null, 2));
      transformedCookies = JSON.parse(jsonString);
    }

    // save in memory
    Login.jar = transformedCookies;
  } catch (ex) {
    log.error('Invalid cookies from jar.getCookies');
  }

  return transformedCookies;
};

Login.getUserInfo = function getUserInfo(jar) {
  var q = Q.defer();

  var url = [settings.IONIC_DASH_API, 'user?format=json'].join('');

  request({
    method: 'GET',
    url: url,
    headers: {
      cookie: jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; ')
    },
    proxy: Utils.getProxy()
  }, function(err, response, body) {
    if (err) {
      return q.reject('Error logging in: ' + err);
    }

    if (parseInt(response.statusCode, 10) !== 200) {
      return q.reject('Could not get user info: ' + response);
    }

    try {

      // Got results
      var data = JSON.parse(body);
      q.resolve(data);
    } catch (ex) {
      log.error('Error: ', ex);
      q.reject(ex);
    }
  });
  return q.promise;
};

Login.getUserApps = function getUserApps(jar) {
  var q = Q.defer();
  var url = [settings.IONIC_DASH_API, 'apps?format=json'].join('');

  request({
    method: 'GET',
    url: url,
    headers: {
      cookie: jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; ')
    },
    proxy: Utils.getProxy()
  }, function(err, response, body) {
    if (err) {
      return q.reject('Error logging in: ' + err);
    }

    if (parseInt(response.statusCode, 10) !== 200) {
      return q.reject('Could not get user info: ' + response);
    }

    try {
      var data = JSON.parse(body);
      q.resolve(data);
    } catch (ex) {
      log.error('Error: ', ex);
      q.reject(ex);
    }
  });
  return q.promise;
};

Login.getDownloadLink = function getDownloadLink(jar, appId) {
  var q = Q.defer();
  var url = [settings.IONIC_DASH_API, 'app/', appId, '/updates/download'].join('');

  request({
    method: 'GET',
    url: url,
    headers: {
      cookie: jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; ')
    },
    proxy: Utils.getProxy()
  }, function(err, response, body) {
    if (err) {
      return q.reject('Error logging in: ' + err);
    }

    if (parseInt(response.statusCode, 10) !== 200) {
      return q.reject('Could not get user info: ' + response);
    }

    try {
      var data = JSON.parse(body);
      q.resolve(data.download_url);
    } catch (ex) {
      log.error('Error: ', ex);
      q.reject(ex);
    }
  });
  return q.promise;
};
