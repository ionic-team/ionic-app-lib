var fs = require('fs'),
    request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicProject = require('./project'),
    IonicStore = require('./store').IonicStore,
    Q = require('q'),
    settings = require('./settings'),
    utils = require('./utils');

var Login = module.exports;

Login.jar = null;

//Here we want to look up an existing cookie jar for login if it exists.
//If not, resolve false
Login.retrieveLogin = function retrieveLogin() {
  var q = Q.defer();

  try {
    var cookieData = new IonicStore('cookies');

    if (Login.jar) {
      // already in memory
      console.log('login jar in memory');
      q.resolve(Login.jar);
      return q.promise;
    }

    // this.email = argv.email || argv.e || process.env.IONIC_EMAIL;
    // this.password = argv.password || argv.p || process.env.IONIC_PASSWORD;

    // if(!email && password) {
    //   return utils.fail('--email or -e command line flag, or IONIC_EMAIL environment variable required');
    // }
    // if(email && !password) {
    //   return utils.fail('--password or -p command line flag, or IONIC_PASSWORD environment variable required');
    // }

    // if(!email && !password) {
    //   // did not include cmd line flags, check for existing cookies
      var jar = cookieData.get(settings.IONIC_DASH);

      if(jar && jar.length) {
        for(var i in jar) {
          var cookie = jar[i];
          if(cookie.key == "sessionid" && new Date(cookie.expires) > new Date()) {
            Login.jar = jar;
            q.resolve(Login.jar);
            return q.promise;
          }
        }
      }
    // }
    q.resolve(false);
  } catch (ex) {
    q.reject(ex);
  }

  return q.promise;
};

Login.run = function(ionic, callback) {
  var self = this;

  if(!this.email && !this.password) {

    var schema = [{
      name: 'email',
      pattern: /^[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+(?:\.[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+)*@(?:[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?$/,
      description: 'Email:'.yellow.bold,
      required: true
    }, {
      name: 'password',
      description: 'Password:'.yellow.bold,
      hidden: true,
      required: true
    }];

    // prompt for log
    console.log('\nTo continue, please login to your Ionic account.'.bold.green);
    console.log('Don\'t have one? Create a one at: '.bold + (settings.IONIC_DASH + '/signup').bold + '\n');

    prompt.override = argv;
    prompt.message = '';
    prompt.delimiter = '';
    prompt.start();

    prompt.get(schema, function (err, result) {
      if(err) {
        return utils.fail('Error logging in: ' + err);
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

  var url = [settings.IONIC_DASH, settings.IONIC_API, 'user/login'].join('');

  var jar = request.jar();

  request({
    method: 'POST',
    url: url,
    jar: jar,
    form: {
      username: email.toString(),
      password: password
    },
    proxy: process.env.PROXY || process.env.http_proxy || null
  }, function(err, response, body) {
    if (err) {
      return q.reject('Error logging in: ' + err);
    }

    if (response.statusCode != 200) {
      return q.reject('Email or Password incorrect. Please visit '+ settings.IONIC_DASH.white +' for help.'.red);
    }

    if (saveCookies) {
      transformedCookies = Login.saveCookies(jar);
    } else {
      try {
        var jsonString = JSON.stringify(jar.getCookies(settings.IONIC_DASH, null, 2));
        transformedCookies = JSON.parse(jsonString);
      } catch(ex) {
        console.log('Invalid cookies from jar.getCookies'.red.bold);
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

    if(saveCookies) {
      // save cookies
      if(!cookieData) {
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
    events.emit('log', 'Invalid cookies from jar.getCookies'.red.bold);
  }

  return transformedCookies;
};

Login.getUserInfo = function getUserInfo(jar) {
  var q = Q.defer();

  var url = [settings.IONIC_DASH, settings.IONIC_API, 'user?format=json'].join('');
  // var jar = request.jar();
  console.log('Login.getUserInfo url' + url);

  request({
    method: 'GET',
    url: url,
    jar: jar,
    proxy: process.env.PROXY || process.env.http_proxy || null
  }, function(err, response, body) {
    if (err) {
      return q.reject('Error logging in: ' + err);
    }

    if (response.statusCode != 200) {
      console.log('Login.getUserInfo error - status code wasnt 200');
      console.log(response);
      return q.reject('Could not get user info');
    }

    try {
      //Got results
      console.log('Body', body);
      var data = JSON.parse(body);
      console.log(data);
    } catch (ex) {
      console.log('ex', ex);
    }

    q.resolve(transformedCookies);

  });
  return q.promise;
};
