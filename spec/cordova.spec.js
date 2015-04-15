var Cordova = require('../lib/cordova'),
    cordova = require('cordova-lib').cordova.raw,
    Q = require('q'),
    events = require('../lib/events'),
    helpers = require('./helpers');

var testDirectory = '/test/directory',
    testPluginId = 'org.apache.cordova.device';

describe('Cordova', function() {

  it('should have Cordova defined', function() {
    expect(Cordova).toBeDefined();
  });

  it('should call cordova.platform when addPlatform is called', function(done) {
    spyOn(cordova, 'platform').andReturn(Q());
    Q()    
    .then(function() {
      return Cordova.addPlatform(testDirectory, 'ios');
    })
    .then(function() {
      expect(cordova.platform).toHaveBeenCalledWith('add', ['ios'], {});
    })
    .catch(function(data) {
      console.log(data);
      expect('this').toBe('not this');
    })
    .fin(done);
  });

  it('should call cordova.platform when removePlatform is called', function(done) {
    spyOn(cordova, 'platform').andReturn(Q());
    Q()    
    .then(function() {
      return Cordova.removePlatform(testDirectory, 'ios');
    })
    .then(function() {
      expect(cordova.platform).toHaveBeenCalledWith('remove', ['ios'], {});
    })
    .catch(function(data) {
      console.log(data);
      expect('this').toBe('not this');
    })
    .fin(done);
  });

  it('should call cordova.plugin when addPlugin is called', function(done) {
    spyOn(cordova, 'plugin').andReturn(Q());
    Q()    
    .then(function() {
      return Cordova.addPlugin(testDirectory, testPluginId);
    })
    .then(function() {
      expect(cordova.plugin).toHaveBeenCalledWith('add', testPluginId);
    })
    .catch(function(data) {
      console.log(data);
      expect('this').toBe('not this');
    })
    .fin(done);
  });

  it('should call cordova.plugin when removePlugin is called', function(done) {
    spyOn(cordova, 'plugin').andReturn(Q());
    Q()    
    .then(function() {
      return Cordova.removePlugin(testDirectory, testPluginId);
    })
    .then(function() {
      expect(cordova.plugin).toHaveBeenCalledWith('remove', testPluginId);
    })
    .catch(function(data) {
      console.log(data);
      expect('this').toBe('not this');
    })
    .fin(done);
  });

  it('should call cordova.run when runPlatform is called', function(done) {
    spyOn(cordova, 'run').andReturn(Q());
    
    var options = {
      platforms: ['ios'],
      options: [],
      verbose: false,
      silent: false,
      browserify: false
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

  // it('should call serve when livereload is passed', function(done) {

  //   Q()    
  //   .then(function() {
  //     return Cordova.runPlatform(testDirectory, 'ios');
  //   })
  //   .then(function() {
  //     expect(cordova.run).toHaveBeenCalledWith(options);
  //   })
  //   .catch(function(data) {
  //     console.log(data);
  //     expect('this').toBe('not this');
  //   })
  //   .fin(done);
  // });  

});
