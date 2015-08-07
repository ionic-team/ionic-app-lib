var Q = require('q'),
    rewire = require('rewire'),
    helpers = require('./helpers'),
    logging = require('../lib/logging');

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

    Package.packageAndroidDebug(fakeAppId, fakeAppDir, fakeJar)
      .then(function(buildId) {
        console.log('1');
        expect(buildId).toBe("123456");
        console.log('2');
        done();
        console.log('3');
      })
      .catch(function(ex) {
        console.log(ex);
      });
  });

});
