var Cordova = require('../lib/cordova'),
    cordova = require('ionic-cordova-lib').cordova.raw,
    Q = require('q'),
    helpers = require('./helpers'),
    state = require('../lib/state'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

var testDirectory = '/test/directory',
    testPluginId = 'org.apache.cordova.device';

describe('Cordova', function() {

  it('should have Cordova defined', function() {
    expect(Cordova).toBeDefined();
  });

  describe('#removePlatform', function() {
    it('should call cordova.platform when removePlatform is called', function(done) {
      spyOn(cordova, 'platform').andReturn(Q());
      Q()    
      .then(function() {
        return Cordova.removePlatform(testDirectory, 'ios');
      })
      .then(function() {
        expect(cordova.platform).toHaveBeenCalledWith('remove', ['ios'], {});
      })
      .catch(function(error) {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should call state.removePlatform when removePlatform is called to save platform', function(done) {
      spyOn(cordova, 'platform').andReturn(Q());
      spyOn(state, 'removePlatform').andReturn(Q());
      Q()    
      .then(function() {
        return Cordova.removePlatform(testDirectory, 'ios', true);
      })
      .then(function() {
        expect(state.removePlatform).toHaveBeenCalledWith(testDirectory, 'ios');
      })
      .catch(function(error) {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should not call state.savePlatform when removePlatform is called to save platform', function(done) {
      spyOn(cordova, 'platform').andReturn(Q());
      spyOn(state, 'removePlatform').andReturn(Q());
      Q()    
      .then(function() {
        return Cordova.removePlatform(testDirectory, 'ios');
      })
      .then(function() {
        expect(state.removePlatform).not.toHaveBeenCalled();
      })
      .catch(function(error) {
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  describe('#addPlugin', function() {
    it('should call cordova.plugin when addPlugin is called', function(done) {
      spyOn(cordova, 'plugin').andReturn(Q());
      Q()    
      .then(function() {
        return Cordova.addPlugin(testDirectory, testPluginId);
      })
      .then(function() {
        expect(cordova.plugin).toHaveBeenCalledWith('add', testPluginId, {stdio:'pipe'});
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
      Q()    
      .then(function() {
        return Cordova.addPlugin(testDirectory, 'org.apache.cordova.device');
      })
      .then(function() {
        expect(state.savePlugin).not.toHaveBeenCalled();
      })
      .catch(function(error) {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should call state.savePlugin when addPlugin is called to save plugin', function(done) {
      spyOn(cordova, 'plugin').andReturn(Q());
      spyOn(state, 'savePlugin').andReturn(Q());
      Q()    
      .then(function() {
        return Cordova.addPlugin(testDirectory, 'org.apache.cordova.device', null, true);
      })
      .then(function() {
        expect(state.savePlugin).toHaveBeenCalled();
      })
      .catch(function(error) {
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  describe('#removePlugin', function() {
    it('should call cordova.plugin when removePlugin is called', function(done) {
      spyOn(cordova, 'plugin').andReturn(Q());
      Q()    
      .then(function() {
        return Cordova.removePlugin(testDirectory, testPluginId);
      })
      .then(function() {
        expect(cordova.plugin).toHaveBeenCalledWith('remove', testPluginId, {stdio:'pipe'});
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
        expect(cordova.platform).toHaveBeenCalledWith('add', ['ios'], {stdio: 'pipe'});
      })
      .catch(function(data) {
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
      .catch(function(data) {
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
      .catch(function(data) {
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  }); 

});
