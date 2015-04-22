var State = require('../lib/state'),
    events = require('../lib/events'),
    helpers = require('./helpers');

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
      expect(defaultPackageJson).toBe(defaultPackageJson);
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
  });

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

});
