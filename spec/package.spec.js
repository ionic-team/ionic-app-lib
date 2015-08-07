var Q = require('q'),
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

  it('should have Package.packageAndroidDebug defined', function() {
    expect(Package.packageAndroidDebug).toBeDefined();
  });

  it('should have Package.packageAndroidRelease defined', function() {
    expect(Package.packageAndroidRelease).toBeDefined();
  });

  it('should have Package.packageIOS defined', function() {
    expect(Package.packageIOS).toBeDefined();
  });

  it('should get 202 and message from package service', function(done) {
    var fakeAppId = 'abcdef',
        fakeAppDir = '/Users/Test/myApp',
        fakeJar = {};

    var UploadSpy = {
      doUpload: createSpy('doUpload').andCallFake(function(appDirectory, jar, name) {
        var q = Q.defer();
        q.resolve({ url: 'http://test' });
        return q.promise;
      })
    };

    var IonicProjectSpy = {
      load: createSpy('load').andCallFake(function(appDirectory) {
        return { app_id: 'abcdef' };
      })
    };

    var requestSpy = {
      post: createSpy('request').andCallFake(function(settings, callback) {
        callback(null, { statusCode: 202 }, '{"data":{"build_id":"123456"}}');
      })
    };

    Package.__set__('Upload', UploadSpy);
    Package.__set__('IonicProject', IonicProjectSpy);
    Package.__set__('request', requestSpy);

    spyOn(ConfigXml, 'loadToStream');
    spyOn(State, 'getPackageJsonReadStream');

    Package.packageAndroidDebug(fakeAppId, fakeAppDir, fakeJar)
      .then(function(buildId) {
        expect(buildId).toBe("123456");
      })
      .catch(function(ex) {
        console.log(ex);
      }).
      fin(done);
  });

});
