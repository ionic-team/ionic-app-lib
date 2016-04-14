var fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    rewire = require('rewire'),
    ConfigXml = require('../lib/config-xml'),
    helpers = require('./helpers'),
    logging = require('../lib/logging'),
    State = require('../lib/state');

logging.logger = helpers.testingLogger;

describe('Package', function() {
  var Package;

  beforeEach(function() {
    Package = rewire('../lib/package');
  });

  it('should have Package defined', function() {
    expect(Package).toBeDefined();
  });

  it('should have Package.buildAndroidDebug defined', function() {
    expect(Package.buildAndroidDebug).toBeDefined();
  });

  it('should have Package.buildAndroidRelease defined', function() {
    expect(Package.buildAndroidRelease).toBeDefined();
  });

  it('should have Package.buildIOS defined', function() {
    expect(Package.buildIOS).toBeDefined();
  });

  it('should have Package.listBuilds defined', function() {
    expect(Package.listBuilds).toBeDefined();
  });

  it('should have Package.getBuild defined', function() {
    expect(Package.getBuild).toBeDefined();
  });

  it('should get 202 and message from package service', function(done) {
    spyOn(fs, 'unlinkSync');
    spyOn(fs, 'existsSync').andReturn(true);
    spyOn(fs, 'createReadStream');

    var fakeAppId = 'abcdef',
        fakeAppDir = '/Users/Test/myApp',
        fakeJar = {
          map: createSpy('map').andReturn([])
        },
        options = {};

    var UploadSpy = {
      doUpload: createSpy('doUpload').andCallFake(function(appDirectory, jar, name) {
        var q = Q.defer();
        q.resolve({ url: 'http://test' });
        return q.promise;
      })
    };

    var UtilsSpy = {
      createArchive: createSpy('createArchive').andCallFake(function(appDirectory, documentRoot) {
        var q = Q.defer();
        q.resolve(path.join(appDirectory, documentRoot) + '.zip');
        return q.promise;
      }),
      retrieveCsrfToken: createSpy('retrieveCsrfToken').andReturn('asdf')
    };

    var IonicProjectSpy = {
      load: createSpy('load').andCallFake(function(appDirectory) {
        return { app_id: 'abcdef' };
      })
    };

    var requestSpy = {
      post: createSpy('request').andCallFake(function(settings, callback) {
        callback(null, { statusCode: 202 }, '{"data":{"id":"123456"}}');
      })
    };

    Package.__set__('Upload', UploadSpy);
    Package.__set__('IonicProject', IonicProjectSpy);
    Package.__set__('request', requestSpy);
    Package.__set__('Utils', UtilsSpy);

    spyOn(ConfigXml, 'loadToStream');
    spyOn(State, 'getPackageJsonReadStream');

    Package.buildAndroidDebug(fakeAppId, fakeAppDir, fakeJar, options)
      .then(function(buildId) {
        expect(buildId).toBe("123456");
      })
      .catch(function(ex) {
        expect('this').toBe(ex.stack);
      })
      .fin(done);

  });

});
