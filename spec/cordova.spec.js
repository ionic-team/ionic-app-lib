var Cordova = require('../lib/cordova');
var cordova = require('cordova-lib').cordova.raw;
var Q = require('q');
var helpers = require('./helpers');
var state = require('../lib/state');
var logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

var testDirectory = '/test/directory';
var testPluginId = 'org.apache.cordova.device';

describe('Cordova', function() {

  it('should have Cordova defined', function() {
    expect(Cordova).toBeDefined();
    expect(Cordova.Lib).toBeDefined();
    expect(Cordova.runCordova).toEqual(jasmine.any(Function));
    expect(Cordova.setupLiveReload).toEqual(jasmine.any(Function));
    expect(Cordova.addPlatform).toEqual(jasmine.any(Function));
    expect(Cordova.removePlatform).toEqual(jasmine.any(Function));
    expect(Cordova.runPlatform).toEqual(jasmine.any(Function));
    expect(Cordova.addPlugin).toEqual(jasmine.any(Function));
    expect(Cordova.removePlugin).toEqual(jasmine.any(Function));
    expect(Cordova.buildPlatform).toEqual(jasmine.any(Function));
    expect(Cordova.preparePlatform).toEqual(jasmine.any(Function));
  });

  describe('#removePlatform', function() {
    it('should call cordova.platform when removePlatform is called', function(done) {
      spyOn(cordova, 'platform').andReturn(Q());

      Cordova.removePlatform(testDirectory, 'ios').then(function() {
        expect(cordova.platform).toHaveBeenCalledWith('remove', ['ios'], {});
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should call state.removePlatform when removePlatform is called to save platform', function(done) {
      spyOn(cordova, 'platform').andReturn(Q());
      spyOn(state, 'removePlatform').andReturn(Q());

      Cordova.removePlatform(testDirectory, 'ios', true).then(function() {
        expect(state.removePlatform).toHaveBeenCalledWith(testDirectory, 'ios');
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should not call state.savePlatform when removePlatform is called to save platform', function(done) {
      spyOn(cordova, 'platform').andReturn(Q());
      spyOn(state, 'removePlatform').andReturn(Q());

      Cordova.removePlatform(testDirectory, 'ios').then(function() {
        expect(state.removePlatform).not.toHaveBeenCalled();
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  describe('#addPlugin', function() {
    it('should call cordova.plugin when addPlugin is called', function(done) {
      spyOn(cordova, 'plugin').andReturn(Q());

      Cordova.addPlugin(testDirectory, testPluginId).then(function() {
        expect(cordova.plugin).toHaveBeenCalledWith('add', testPluginId, { stdio:'pipe' });
      })
      .catch(function(data) {
        console.log(data);
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should not call state.savePlugin when addPlugin is not called to save plugin', function(done) {
      spyOn(cordova, 'plugin').andReturn(Q());
      spyOn(state, 'savePlugin').andReturn(Q());
      Cordova.addPlugin(testDirectory, 'org.apache.cordova.device').then(function() {
        expect(state.savePlugin).not.toHaveBeenCalled();
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should call state.savePlugin when addPlugin is called to save plugin', function(done) {
      spyOn(cordova, 'plugin').andReturn(Q());
      spyOn(state, 'savePlugin').andReturn(Q());

      Cordova.addPlugin(testDirectory, 'org.apache.cordova.device', null, true).then(function() {
        expect(state.savePlugin).toHaveBeenCalled();
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  describe('#removePlugin', function() {
    it('should call cordova.plugin when removePlugin is called', function(done) {
      spyOn(cordova, 'plugin').andReturn(Q());

      Cordova.removePlugin(testDirectory, testPluginId).then(function() {
        expect(cordova.plugin).toHaveBeenCalledWith('remove', testPluginId, { stdio:'pipe' });
      })
      .catch(function(data) {
        console.log(data);
        expect('this').toBe('not this');
      })
      .fin(done);
    });

  });

  describe('#runPlatform', function() {
    it('should call cordova.run when runPlatform is called', function(done) {
      spyOn(cordova, 'run').andReturn(Q());

      var options = {
        platforms: ['ios'],
        options: [],
        verbose: false,
        silent: false,
        browserify: false,
        stdio: 'pipe'
      };

      Q()
      .then(function() {
        return Cordova.runPlatform(testDirectory, 'ios');
      })
      .then(function() {
        expect(cordova.run).toHaveBeenCalledWith(options);
      })
      .catch(function(data) {
        console.log(data);
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  describe('#addPlatform', function() {
    it('should call cordova.platform when addPlatform is called', function(done) {
      spyOn(cordova, 'platform').andReturn(Q());
      Q()
      .then(function() {
        return Cordova.addPlatform(testDirectory, 'ios');
      })
      .then(function() {
        expect(cordova.platform).toHaveBeenCalledWith('add', ['ios'], { stdio: 'pipe' });
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should call state.savePlatform when addPlatform is called with save platform', function(done) {
      spyOn(cordova, 'platform').andReturn(Q());
      spyOn(state, 'savePlatform').andReturn(Q());
      Q()
      .then(function() {
        return Cordova.addPlatform(testDirectory, 'ios', true);
      })
      .then(function() {
        expect(state.savePlatform).toHaveBeenCalledWith(testDirectory, 'ios');
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should not call state.savePlatform when addPlatform is called without save platform', function(done) {
      spyOn(cordova, 'platform').andReturn(Q());
      spyOn(state, 'savePlatform').andReturn(Q());
      Q()
      .then(function() {
        return Cordova.addPlatform(testDirectory, 'ios');
      })
      .then(function() {
        expect(state.savePlatform).not.toHaveBeenCalled();
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });
});
