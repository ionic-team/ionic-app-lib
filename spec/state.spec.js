var State = require('../lib/state'),
    events = require('../lib/events'),
    helpers = require('./helpers'),
    path = require('path'),
    Q = require('q'),
    shelljs = require('shelljs'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

var tempDirectory = '/test/dev/ionic',
    testPluginId = 'com.ionic.keyboard',
    defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [] };

describe('State', function() {

  it('should have state defined', function() {
    expect(State).toBeDefined();
  });

  it('should get the package json by app directory', function() {
    spyOn(State, 'readInPackageJson').andReturn({});
    var packageJson = State.getPackageJson(tempDirectory);
    expect(State.readInPackageJson).toHaveBeenCalledWith('/test/dev/ionic/package.json');
    expect(packageJson.cordovaPlugins.length).toBe([].length);
    expect(packageJson.cordovaPlatforms.length).toBe([].length);
  });

  describe('#savePlatform', function() {
    beforeEach(function() {
      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      spyOn(State, 'savePackageJson');
    });

    // Locator may be:
    // Name:        ios, android
    // Name with version: ios@3.8.0, android@4.0.0
    // Local path:  ./engine/cordova-android-c0.6.1
    // Http url:    https://github.com/apache/cordova-android.git
    it('should call getPackageJson with the correct directory', function() {
      spyOn(State, 'addOrUpdatePlatformToPackageJson');
      State.savePlatform(tempDirectory, 'ios');
      expect(State.getPackageJson).toHaveBeenCalledWith(tempDirectory);
      // expect(State.addOrUpdatePlatformToPackageJson).toHaveBeenCalledWith()
    });

    it('should call addOrUpdatePlatformToPackageJson with directory and ios when ios is passed', function() {
      spyOn(State, 'addOrUpdatePlatformToPackageJson');
      State.savePlatform(tempDirectory, 'ios');
      expect(State.addOrUpdatePlatformToPackageJson).toHaveBeenCalledWith(defaultPackageJson, 'ios');
    });

    it('should call savePackageJson with app directory and packageJson data', function() {
      spyOn(State, 'addOrUpdatePlatformToPackageJson').andCallFake(function(packageJson){
        packageJson.cordovaPlatforms = ['ios'];
      });

      State.savePlatform(tempDirectory, 'ios');
      expect(State.addOrUpdatePlatformToPackageJson).toHaveBeenCalledWith(defaultPackageJson, 'ios');
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, { cordovaPlatforms: ['ios'], cordovaPlugins: [] });
    });

    it('should save ios and version with both are passed', function() {
      var packageJson = 
      spyOn(State, 'addOrUpdatePlatformToPackageJson').andCallFake(function(packageJson) {
        packageJson.cordovaPlatforms = [{ platform: 'ios', locator: 'ios@3.8.0', version: '3.8.0' }];
      });
      State.savePlatform(tempDirectory, 'ios@3.8.0');
      expect(State.addOrUpdatePlatformToPackageJson).toHaveBeenCalledWith(defaultPackageJson, 'ios', {platform: 'ios', locator: 'ios@3.8.0', version: '3.8.0'});
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, defaultPackageJson);
    });

    it('should save android version from remote URL', function() {
      spyOn(State, 'addOrUpdatePlatformToPackageJson').andCallFake(function(packageJson) {
        packageJson.cordovaPlatforms = [{ platform: 'android', locator: 'https://github.com/apache/cordova-android', version: '4.0.0' }];
      });
      State.savePlatform(tempDirectory, 'https://github.com/apache/cordova-android');
      expect(State.addOrUpdatePlatformToPackageJson).toHaveBeenCalledWith(defaultPackageJson, 'android', {platform: 'android', locator: 'https://github.com/apache/cordova-android'});
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, defaultPackageJson);
    });

    it('should save android version from local path', function() {
      var fileLocator = './engine/cordova-android';
      spyOn(State, 'addOrUpdatePlatformToPackageJson').andCallFake(function(packageJson) {
        packageJson.cordovaPlatforms = [{ platform: 'android', locator: fileLocator }];
      });
      State.savePlatform(tempDirectory, fileLocator);
      expect(State.addOrUpdatePlatformToPackageJson).toHaveBeenCalledWith(defaultPackageJson, 'android', {platform: 'android', locator: fileLocator});
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, defaultPackageJson);
    });
  });

  describe('#addOrUpdatePlatformToPackageJson', function() {
    it('should overwrite default android when local android is added', function() {
      var fileLocator = './engine/cordova-android';
      defaultPackageJson = { cordovaPlatforms: ['android'], cordovaPlugins: [] };
      var afterPackageJson = { cordovaPlatforms: [{platform: 'android', locator: fileLocator}], cordovaPlugins: [] };
      var platformInfo = { platform: 'android', locator: fileLocator };

      State.addOrUpdatePlatformToPackageJson(defaultPackageJson, 'android', platformInfo);
      expect(defaultPackageJson).toEqual(afterPackageJson);
    });

    it('should overwrite ios version when ios and version are added', function() {
      defaultPackageJson = { cordovaPlatforms: [{platform: 'ios', locator: 'ios@3.7.0', version: '3.7.0'}], cordovaPlugins: [] };
      var afterPackageJson = { cordovaPlatforms: [{platform: 'ios', locator: 'ios@3.8.0', version: '3.8.0'}], cordovaPlugins: [] };
      var platformInfo = { platform: 'ios', locator: 'ios@3.8.0', version: '3.8.0' };

      State.addOrUpdatePlatformToPackageJson(defaultPackageJson, 'ios', platformInfo);
      expect(defaultPackageJson).toEqual(afterPackageJson);
    });
  });

  describe('#removePlatform', function() {
    beforeEach(function() {
      //Start with ios in package.json
      spyOn(State, 'savePackageJson');
    });

    it('should call getPackageJson with the correct directory', function() {
      defaultPackageJson = { cordovaPlatforms: ['ios'] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      State.removePlatform(tempDirectory, 'ios');
      expect(State.getPackageJson).toHaveBeenCalledWith(tempDirectory);
    });

    it('should remove platform from packageJson when plain ios exists', function() {
      defaultPackageJson = { cordovaPlatforms: ['ios'] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);

      State.removePlatform(tempDirectory, 'ios');
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, { cordovaPlatforms: []});
    });

    it('should remove platform from packageJson when android with locator exists', function() {
      defaultPackageJson = { cordovaPlatforms: [ { platform: 'android', locator: 'https://github.com/apache/cordova-android' } ] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);

      State.removePlatform(tempDirectory, 'android');
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, { cordovaPlatforms: []});
    });

    it('should remove platform from packageJson when android with file locator exists', function() {
      defaultPackageJson = { cordovaPlatforms: [ { platform: 'android', locator: './engine/cordova-android' } ] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);

      State.removePlatform(tempDirectory, 'android');
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, { cordovaPlatforms: []});
    });

    it('should remove only one platforms from packageJson when both exist', function() {
      defaultPackageJson = { cordovaPlatforms: [ 'ios', { platform: 'android', locator: './engine/cordova-android' } ] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      State.removePlatform(tempDirectory, 'android');
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, { cordovaPlatforms: ['ios']});
    });
  });

  describe('#savePlugin', function() {
    beforeEach(function() {
      spyOn(State, 'savePackageJson');
      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [testPluginId] };
    });
    //Expects - either simple ID for plugin registry
    //or a local path, with or without variables
    //ionic plugin add org.apache.cordova.splashscreen
    //ionic plugin add ../phonegap-facebook-plugin --variable APP_ID="123456789" --variable APP_NAME="myApplication"
    it('should call getPackageJson with the correct directory', function() {
      spyOn(State, 'addOrUpdatePluginToPackageJson');
      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [testPluginId] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      State.savePlugin(tempDirectory, testPluginId);
      expect(State.getPackageJson).toHaveBeenCalledWith(tempDirectory);
    });

    it('should save the plugin ID to the packageJson for a simple ID', function() {
      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      spyOn(State, 'addOrUpdatePluginToPackageJson').andCallFake(function(packageJson) {
        packageJson.cordovaPlugins = [testPluginId];
      })
      State.savePlugin(tempDirectory, testPluginId);
      expect(State.addOrUpdatePluginToPackageJson).toHaveBeenCalledWith(defaultPackageJson, testPluginId);
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, defaultPackageJson);
    });

    it('should save the plugin ID to the packageJson for a local ID', function() {
      var testLocalPluginId = './engine/cordova-crosswalk-plugin';
      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      spyOn(State, 'getPluginFromFetchJsonByLocator').andReturn('cordova-crosswalk-engine');
      spyOn(State, 'addOrUpdatePluginToPackageJson').andCallFake(function(packageJson) {
        packageJson.cordovaPlugins = [{locator: testLocalPluginId, id: 'cordova-crosswalk-engine'}];
      })
      State.savePlugin(tempDirectory, testLocalPluginId);
      expect(State.addOrUpdatePluginToPackageJson).toHaveBeenCalledWith(defaultPackageJson, 'cordova-crosswalk-engine', {locator: testLocalPluginId, id: 'cordova-crosswalk-engine'});
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, defaultPackageJson);
    });

    it('should save the plugin ID to the packageJson for a local ID', function() {
      var testLocalPluginId = './engine/cordova-facebook-plugin';
      var testVariables = [ 'APP_ID=123456789', 'APP_NAME=myApplication' ];
      var variablesHash = {APP_ID: '123456789', APP_NAME: 'myApplication'};
      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [] };
      var modifiedPackageJson = { cordovaPlatforms: [], cordovaPlugins: [{locator: testLocalPluginId, id: 'cordova-facebook-plugin', variables: variablesHash}]};
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      spyOn(State, 'getPluginFromFetchJsonByLocator').andReturn('cordova-facebook-plugin');
      spyOn(State, 'addOrUpdatePluginToPackageJson').andCallFake(function(packageJson) {
        packageJson.cordovaPlugins = [{locator: testLocalPluginId, id: 'cordova-facebook-plugin', variables: variablesHash}];
      });

      State.savePlugin(tempDirectory, testLocalPluginId, testVariables);

      expect(State.addOrUpdatePluginToPackageJson).toHaveBeenCalledWith(defaultPackageJson, 'cordova-facebook-plugin', {locator: testLocalPluginId, id: 'cordova-facebook-plugin', variables: variablesHash});
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, modifiedPackageJson);
    });

    it('should call getPluginFromFetchJsonByLocator with correct parameters', function() {
      var testRemoteUrl = 'https://github.com/apache/cordova-plugin-whitelist.git#r1.0.0';
      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [] };
      spyOn(State, 'getPluginFromFetchJsonByLocator');
      spyOn(State, 'addOrUpdatePluginToPackageJson');
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      try {
        State.savePlugin(tempDirectory, testRemoteUrl, null);
      } catch (ex) {
        console.log(ex);
      }
      expect(State.getPluginFromFetchJsonByLocator).toHaveBeenCalledWith(tempDirectory, testRemoteUrl);
      expect(State.savePackageJson).toHaveBeenCalled();
    });
  });

  // describe('getPluginFromFetchJsonByLocator', function() {

  // });

  describe('#removePlugin', function() {
    beforeEach(function() {
      spyOn(State, 'savePackageJson');
    });

    it('should call getPackageJson with the correct directory', function() {
      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [testPluginId] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      State.removePlugin(tempDirectory, testPluginId);
      expect(State.getPackageJson).toHaveBeenCalledWith(tempDirectory);
    });

    it('should remove the pluginId from the packageJson from simple plugin IDs in cordovaPlugins', function() {
      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [testPluginId] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      State.removePlugin(tempDirectory, testPluginId);
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, { cordovaPlatforms: [], cordovaPlugins: [] });
    });

    it('should remove the pluginId from the packageJson when its an object', function() {
      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [{ id: 'cordova-crosswalk-engine', locator: './engine/cordova-crosswalk-engine'}] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);
      State.removePlugin(tempDirectory, 'cordova-crosswalk-engine');
      expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, { cordovaPlatforms: [], cordovaPlugins: [] });
    });
  });

  describe('#addOrUpdatePluginToPackageJson', function() {
    it('should add the plugin ID with http url', function() {
      defaultPackageJson = {
        "cordovaPlugins": [
            "org.apache.cordova.device",
            "org.apache.cordova.console",
            "com.ionic.keyboard",
            {
              "locator": "engine/cordova-crosswalk-engine-c0.7.1",
              "id": "cordova-plugin-crosswalk-webview"
            },
            "org.apache.cordova.splashscreen"
          ],
          "cordovaPlatforms": [
            "ios",
            {
              "platform": "android",
              "locator": "./engine/cordova-android-c0.6.1/"
            }
          ]
        };

      expect(defaultPackageJson.cordovaPlugins.length).toBe(5);
      State.addOrUpdatePluginToPackageJson(defaultPackageJson, {id:'cordova-plugin-whitelist', locator: 'https://github.com/apache/cordova-plugin-whitelist.git#r1.0.0'});
      //we had 5 plugins, we should have 6 now.
      expect(defaultPackageJson.cordovaPlugins.length).toBe(6);
    });
  });

  describe('#restoreState', function(){
    it('should only restore plugins when plugin option passed', function(done) {
      var options = { plugins: true, platforms: false };
      spyOn(State, 'restorePlatforms');
      spyOn(State, 'restorePlugins');

      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);

      Q()
      .then(function(){
        return State.restoreState(tempDirectory, options);
      })
      .then(function(){
        expect(State.restorePlugins).toHaveBeenCalledWith(tempDirectory, defaultPackageJson);
        expect(State.restorePlatforms).not.toHaveBeenCalledWith(tempDirectory);
      })
      .catch(function(ex) {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should only restore platforms when platform option passed', function(done) {
      var options = { plugins: false, platforms: true };
      spyOn(State, 'restorePlatforms').andReturn(Q());
      spyOn(State, 'restorePlugins').andReturn(Q());

      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);

      Q()
      .then(function(){
        return State.restoreState(tempDirectory, options);
      })
      .then(function(){
        expect(State.restorePlugins).not.toHaveBeenCalledWith(tempDirectory, defaultPackageJson);
        expect(State.restorePlatforms).toHaveBeenCalledWith(tempDirectory, defaultPackageJson);
      })
      .catch(function(ex) {
        expect('this').toBe('not this');
        console.log(ex.stack)
      })
      .fin(done);
    });

    it('should restore platforms and plugins when both options passed', function(done) {
      var options = { plugins: true, platforms: true };
      spyOn(State, 'restorePlatforms').andReturn(Q());
      spyOn(State, 'restorePlugins').andReturn(Q());

      defaultPackageJson = { cordovaPlatforms: [], cordovaPlugins: [] };
      spyOn(State, 'getPackageJson').andReturn(defaultPackageJson);

      Q()
      .then(function(){
        return State.restoreState(tempDirectory, options);
      })
      .then(function(){
        expect(State.restorePlugins).toHaveBeenCalledWith(tempDirectory, defaultPackageJson);
        expect(State.restorePlatforms).toHaveBeenCalledWith(tempDirectory, defaultPackageJson);
      })
      .catch(function(ex) {
        expect('this').toBe('not this');
        console.log(ex.stack)
      })
      .fin(done);
    });

    it('should check for undefined options', function() {
      expect(State.restoreState).toThrow('You must pass an application directory and options to restore state.');
    });
  });

  describe('#resetState', function() {
    it('should call call rm on the platforms path', function() {
      spyOn(shelljs, 'rm');
      spyOn(State, 'restoreState').andReturn(Q());
      State.resetState(tempDirectory, {});

      var platformPath = path.join(tempDirectory, 'platforms');
      var pluginPath = path.join(tempDirectory, 'plugins');
      expect(shelljs.rm).toHaveBeenCalledWith('-rf', [platformPath, pluginPath]);
      expect(State.restoreState).toHaveBeenCalledWith(tempDirectory, {});
    });
  });

  describe('#restorePlugins', function(){
    it('should call processPlugin with the correct app directory, index, and a promise', function(done){
      var promise = Q.defer();
      spyOn(Q, 'defer').andReturn(promise);
      spyOn(State, 'processPlugin');
      Q()
      .then(function(){
        promise.resolve();
        return State.restorePlugins(tempDirectory, defaultPackageJson);
      })
      .then(function() {
        expect(State.processPlugin).toHaveBeenCalledWith(tempDirectory, 0, defaultPackageJson, promise);      
      })
      .catch(function(ex) {
        console.log(ex.stack);
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  describe('#restorePlatforms', function(){
    it('should call processPlatform with the correct app directory, index, and a promise', function(done){
      var promise = Q.defer();
      spyOn(Q, 'defer').andReturn(promise);
      spyOn(State, 'processPlatform');
      Q()
      .then(function(){
        promise.resolve();
        return State.restorePlatforms(tempDirectory, defaultPackageJson);
      })
      .then(function() {
        expect(State.processPlatform).toHaveBeenCalledWith(tempDirectory, 0, defaultPackageJson, promise);      
      })
      .catch(function(ex) {
        console.log(ex.stack);
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  describe('#clearState', function (){
    it('should clear our the packageJson entries and remove platforms and plugins', function(done) {
      spyOn(State, 'getPackageJson').andReturn({cordovaPlatforms: ['ios'], cordovaPlugins: ['org.apache.cordova.device']});
      spyOn(shelljs, 'rm');
      spyOn(State, 'savePackageJson');
      Q()
      .then(function(){
        return State.clearState(tempDirectory);
      })
      .then(function() {
        expect(shelljs.rm).toHaveBeenCalledWith('-rf', [path.join(tempDirectory, 'platforms'), path.join(tempDirectory, 'plugins')]);
        expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, {cordovaPlatforms: [], cordovaPlugins: []});
      })
      .catch(function(ex) {
        console.log(ex.stack);
        expect('this').toBe('not this');
      })
      .fin(done);
    })
  });

  describe('#saveState', function (){
    it('should save the state of our application', function(done) {
      var packageJson = {cordovaPlatforms: [], cordovaPlugins: []};
      spyOn(State, 'getPackageJson').andReturn(packageJson);
      spyOn(State, 'saveExistingPlatforms');
      spyOn(State, 'saveExistingPlugins');
      spyOn(State, 'savePackageJson');

      Q()
      .then(function(){
        return State.saveState(tempDirectory);
      })
      .then(function() {
        expect(State.saveExistingPlugins).toHaveBeenCalledWith(tempDirectory, packageJson);
        expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, packageJson);
        expect(State.savePackageJson).toHaveBeenCalledWith(tempDirectory, packageJson);
      })
      .catch(function(ex) {
        console.log(ex.stack);
        expect('this').toBe('not this');
      })
      .fin(done);
    })
  });

  describe('#getPluginFromFetchJsonByLocator', function() {
    it('should get the correct plugin by ID from fetch.json', function() {
      var plugin = State.getPluginFromFetchJsonByLocator(__dirname, 'cordova-plugin-googleplus');
      // console.log('plugin yo', plugin);
      expect(plugin).toBe('cordova-plugin-googleplus');
    });
  });

});
