var Q = require('q');
var chalk = require('chalk');
var rewire = require('rewire');
var settings = require('../lib/settings');
var helpers = require('./helpers');
var logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

var cookieJar = [
  {
    key: '__cfduid',
    value: 'cfduid',
    expires: '2016-05-28T16:24:12.000Z',
    path: '/',
    domain: 'ionic.io',
    httpOnly: true,
    creation: '2015-05-29T16:24:16.691Z',
    _creationRuntimeIdx: 1,
    _initialCreationTime: 1432916656691,
    hostOnly: false,
    lastAccessed: '2015-05-29T16:24:16.704Z'
  },
  {
    key: 'csrftoken',
    value: 'csrftoken',
    domain: 'ionic.io',
    expires: '2016-05-27T16:24:14.000Z',
    maxAge: 31449600,
    path: '/',
    creation: '2015-05-29T16:24:16.692Z',
    _creationRuntimeIdx: 2,
    _initialCreationTime: 1432916656692,
    hostOnly: false,
    lastAccessed: '2015-05-29T16:24:16.704Z'
  },
  {
    key: 'sessionid',
    value: 'sesshionid',
    domain: 'ionic.io',
    expires: '2015-06-12T16:24:14.000Z',
    httpOnly: true,
    maxAge: 1209600,
    path: '/',
    creation: '2015-05-29T16:24:16.692Z',
    _creationRuntimeIdx: 3,
    _initialCreationTime: 1432916656692,
    hostOnly: false,
    lastAccessed: '2015-05-29T16:24:16.704Z'
  }
];

describe('Login', function() {
  var Login;

  beforeEach(function() {
    Login = rewire('../lib/login');
  });

  it('should have Login defined', function() {
    expect(Login).toBeDefined();
  });

  it('should show invalid email or password message', function(done) {
    function fakeRequestFunc(settings, callback) {
      var responseFake = {
        statusCode: '401'
      };
      callback(null, responseFake, null);
    }

    var requestSpy = jasmine.createSpy('request').andCallFake(fakeRequestFunc);

    var jarSpy = jasmine.createSpy('jar').andReturn({ getCookies: function() { return cookieJar; } });
    requestSpy.jar = jarSpy;

    Login.__set__('request', requestSpy);

    Q()
    .then(function() {
      return Login.requestLogIn('user@ionic.io', 'password', false);
    })
    .then(function() {
      expect('this').toBe('not this');
    })
    .catch(function(ex) {
      expect(ex).toBe(chalk.red('Email or Password incorrect. Please visit ') +
                      chalk.white(settings.IONIC_DASH) + chalk.red(' for help.'));
    })
    .fin(done);
  });

  it('should return jar for cookies upon successful login', function(done) {
    function fakeRequestFunc(settings, callback) {
      var responseFake = {
        statusCode: '200'
      };
      callback(null, responseFake, null);
    }

    var requestSpy = jasmine.createSpy('request').andCallFake(fakeRequestFunc);

    var jarSpy = jasmine.createSpy('jar').andReturn({ getCookies: function() { return cookieJar; } });
    requestSpy.jar = jarSpy;

    Login.__set__('request', requestSpy);
    spyOn(Login, 'saveCookies');

    Q()
    .then(function() {
      return Login.requestLogIn('test@drifty.com', 'testme', true);
    })
    .then(function() {
      var url = [settings.IONIC_DASH_API, 'user/login'].join('');
      var postParams = {
        method: 'POST',
        url: url,
        jar: cookieJar,
        form: {
          username: 'test@drifty.com',
          password: 'testme'
        },
        proxy: null
      };
      var requestArgs = requestSpy.argsForCall[0];
      var postedParams = requestArgs[0];
      expect(jarSpy).toHaveBeenCalled();
      expect(postedParams.form.username).toBe(postParams.form.username);
      expect(postedParams.form.password).toBe(postParams.form.password);
      expect(Login.saveCookies).toHaveBeenCalled();
    })
    .catch(function(ex) {
      expect('this').toBe(ex.stack);
    })
    .fin(done);
  });

  it('should not call saveCookies upon successful login', function(done) {
    function fakeRequestFunc(settings, callback) {
      var responseFake = {
        statusCode: '200'
      };
      callback(null, responseFake, null);
    }

    var requestSpy = jasmine.createSpy('request').andCallFake(fakeRequestFunc);

    var jarSpy = jasmine.createSpy('jar').andReturn({ getCookies: function() { return cookieJar; } });
    requestSpy.jar = jarSpy;

    Login.__set__('request', requestSpy);
    spyOn(Login, 'saveCookies');

    Q()
    .then(function() {
      return Login.requestLogIn('test@drifty.com', 'testme', false);
    })
    .then(function() {
      var url = [settings.IONIC_DASH_API, 'user/login'].join('');
      var postParams = {
        method: 'POST',
        url: url,
        jar: cookieJar,
        form: {
          username: 'test@drifty.com',
          password: 'testme'
        },
        proxy: null
      };
      var requestArgs = requestSpy.argsForCall[0];
      var postedParams = requestArgs[0];
      expect(jarSpy).toHaveBeenCalled();
      expect(postedParams.form.username).toBe(postParams.form.username);
      expect(postedParams.form.password).toBe(postParams.form.password);
      expect(Login.saveCookies).not.toHaveBeenCalled();
    })
    .catch(function(ex) {
      expect('this').toBe(ex.stack);
    })
    .fin(done);
  });
});
