var fs = require('fs'),
  path = require('path'),
  Q = require('q'),
  shelljs = require('shelljs'),
  Utils = require('./utils'),
  _ = require('underscore');

var State = module.exports;

shelljs.config.silent = true;

State.readInPackageJson = function readInPackageJson(jsonPath) {
  return require(jsonPath);
};

State.getPackageJson = function getPackageJson(appDirectory) {
  var packageJsonPath = path.join(appDirectory, 'package.json');
  var packageJson = null;

  try {
    // packageJson = require(packageJsonPath);
    packageJson = State.readInPackageJson(packageJsonPath);
    if (!packageJson.cordovaPlugins) {
      packageJson.cordovaPlugins = [];
    }
    if (!packageJson.cordovaPlatforms) {
      packageJson.cordovaPlatforms = [];
    }
  } catch (ex) {
    events.emit('log', 'There was an error opening your package.json file.');
    events.emit('log', ex);
    Utils.fail(ex);
  }

  return packageJson;
};

State.addOrUpdatePluginToPackageJson = function addOrUpdatePluginToPackageJson(packageJson, pluginId, pluginInfo) {
  var existingPlugin;

  if (typeof pluginInfo === 'undefined') {
    pluginInfo = pluginId;
  }

  //We need to check cordovaPlugins
  //perhaps the ID already exists, or the 'id' in the object with locator exists.
  for (var i = 0, j = packageJson.cordovaPlugins.length; i < j; i++) {
    if (typeof packageJson.cordovaPlugins[i] == 'string' && packageJson.cordovaPlugins[i] == pluginId) {
      existingPlugin = packageJson.cordovaPlugins[i];
    } else if (packageJson.cordovaPlugins[i].id == pluginId) {
      existingPlugin = packageJson.cordovaPlugins[i];
    }
  }

  if (!existingPlugin) {
    packageJson.cordovaPlugins.push(pluginInfo);
  }
};

State.saveState = function saveState(appDirectory) {
  events.emit('log', 'Saving your Ionic app state of platforms and plugins'.blue.bold);
  var packageJson = State.getPackageJson(appDirectory);
  try {
    State.saveExistingPlatforms(appDirectory, packageJson);
    events.emit('log', 'Saved platform'.green);
    State.saveExistingPlugins(appDirectory, packageJson);
    events.emit('log', 'Saved plugins'.green);
    State.savePackageJson(appDirectory, packageJson);
    events.emit('log', 'Saved package.json'.green);
  } catch (ex) {
    events.emit('log', 'There was an error saving your current Ionic setup'.red);
    events.emit('log', 'Error:', ex.stack);
  }
};

State.platformExists = function platformExists(appDirectory, platform) {
  var platformExists = false,
      platformPath,
      platformStats;

  try {
    platformPath = path.join(appDirectory, 'platforms', platform);
    platformStats = fs.statSync(platformPath);
    if (platformStats.isDirectory()) {
      platformExists = true;
    } else {
      platformExists = false;
    }
  } catch (ex) {
  }
  return platformExists;
}

State.saveExistingPlatforms = function saveExistingPlatforms(appDirectory, packageJson) {
  var pp = path.join(appDirectory, 'platforms'),
    platforms = [],
    platformPath,
    platformStats;

  try {
    platforms = fs.readdirSync(pp);
  } catch (ex) {
    return;
  }

  // events.emit('log', 'h')
  platforms.forEach(function(platform) {
    platformPath = path.join(appDirectory, 'platforms', platform);
    platformStats = fs.statSync(platformPath);
    if (!platformStats.isDirectory()) {
      return
    }

    try {
      var versionPath = path.join(appDirectory, platform, 'cordova', 'version');
      var version = State.getPlatformVersion(versionPath);
      var locator = platform;

      //Check to see if its crosswalk
      if (platform === 'android' && version.indexOf('-dev') !== -1) {
        //Look up path for engine/cordova-android path
        var engineFiles = fs.readdirSync(path.join(appDirectory, 'engine'));
        var enginePath = null;
        engineFiles.forEach(function(engineDir) {
          if (engineDir.indexOf('android') !== -1) {
            enginePath = engineDir;
          }
        });
        locator = path.join(appDirectory, 'engine', enginePath);
      }

      var platformExists = _.findWhere(packageJson.cordovaPlatforms, {platform: platform});

      if (!platformExists) {
        packageJson.cordovaPlatforms.push({platform: platform, version: version, locator: locator});
      }

    } catch (ex) {
      events.emit('log', 'There was an error trying to save your existing state', ex);
    }
  });
};

State.saveExistingPlugins = function saveExistingPlugins(appDirectory, packageJson) {
  var pluginDir = path.join(appDirectory, 'plugins');
  // events.emit('log', pluginDir);

  var plugins = fs.readdirSync(pluginDir);
  var pluginId;

  //Lets try just relying on the fetch.json file
  //this file lists all plugins with where they come from, etc
  var fetchJson;

  try {
    fetchJson = require(path.join(appDirectory, 'plugins', 'fetch.json'));
  } catch (ex) { }

  var configXmlPath = path.join(appDirectory, 'config.xml');
  var plugin,
    pluginToAdd,
    locator;
  var cordovaPlugins = [];

  // events.emit('log', 'config xml path ', configXmlPath)
  var configXmlData = State.getXmlData(configXmlPath);

  var pluginPath,
      pluginPathStats,
      pluginXmlPath,
      pluginXml,
      pluginName,
      featureParams,
      preferences,
      hasVariables = false,
      variableList = [],
      keyValueList = {};


  if (fetchJson) {
    // events.emit('log', 'fetchJson', fetchJson)
    //This will break with what we had before
    for (pluginId in fetchJson) {
      // cordovaPlugins.push();
      plugin = fetchJson[pluginId];
      pluginToAdd = {};
      try {
        pluginPath = path.join(appDirectory, 'plugins', pluginId);
        pluginPathStats = fs.statSync(pluginPath);
      } catch (ex) {
        events.emit('log', ['Plugin', pluginId, 'does not exist in the plugins directory. Skipping'].join(' ').yellow);
        continue;
      }

      if (!pluginPathStats.isDirectory()) {
        events.emit('log', ['Plugin', pluginId, 'does not exist in the plugins directory. Skipping'].join(' ').yellow);
        continue;
      }

      // events.emit('log', 'plugin.source.type', plugin.source.type);

      if (plugin.source.type === 'registry') {
        locator = pluginId;
      } else {
        if (plugin.source.type === 'local') {
          locator = plugin.source.path;
        } else { //asume its git
          locator = plugin.source.url;
        }
      }

      pluginXmlPath = path.join(appDirectory, 'plugins', pluginId, 'plugin.xml');
      pluginXml = State.getXmlData(pluginXmlPath)

      pluginName = pluginXml.plugin.name;

      preferences = pluginXml.plugin.preference;

      if (preferences && preferences.length > 0) {
        hasVariables = true;

        preferences.forEach(function(preference) {
          variableList.push(preference.$.name);
          // events.emit('log', 'looking at preference: ', preference)
        })
      }

      hasVariables = false;
      variableList = [];
      keyValueList = {};

      if (hasVariables) {
        // events.emit('log', 'we have avariables to look at:', variableList)
        // var features = configXmlData.widget.feature;
        // events.emit('log', 'features', features)
        featureParams = State.getPluginParameters(configXmlData, pluginName);
        // features.forEach(function(potFeature) {
        //   if(potFeature.$.name == pluginName) {
        //     feature = potFeature
        //   }
        // })

        // events.emit('log', 'feature found:', feature);
        // var featureParams = feature.param;

        variableList.forEach(function(variable) {
          // events.emit('log', 'Looking up variable:', variable)
          for (var i = 0, j = featureParams.length; i < j; i++) {
            if (variable == featureParams[i].$.name) {
              keyValueList[variable] = featureParams[i].$.value;
            }
          }
        })

        // events.emit('log', 'We have the plugin parameters with values:', keyValueList)

        var pluginObj = {id: pluginId, locator: locator, variables: keyValueList};
        cordovaPlugins.push(pluginObj)

      } else if (plugin.source.type === 'git' || plugin.source.type === 'local') {
        cordovaPlugins.push({locator: locator, id: pluginId});
      } else {
        cordovaPlugins.push(pluginId)
      }

    }//closes for loop for fetch.json

    packageJson.cordovaPlugins = cordovaPlugins
  } else {
    events.emit('log', 'There was no fetch.json file available to restore plugin information from.'.red.bold);
    events.emit('log', 'Restoring plugins from scanning the plugins folder is still being worked on.'.red.bold);
  }

}; //Closes saveExistingPlugins

State.getXmlData = function getXmlData(xmlPath) {
  var xml2js = require('xml2js');
  var xmlString = fs.readFileSync(xmlPath, { encoding: 'utf8' });
  var xmlData;
  var parseString = xml2js.parseString;
  parseString(xmlString, function(err, jsonConfig) {
    if (err) {
      return self.fail('Error parsing xml file: ' + err);
    }
    try {
      xmlData = jsonConfig;
    } catch (e) {
      return self.fail('Error parsing ' + xmlPath + ': ' + e);
    }
  });

  return xmlData;
};

State.getPlatformVersion = function getPlatformVersion(path) {
  var result = shelljs.exec(['node', path].join(' '), { silent: true });
  if (result.code != 0) {
    return '';
  }
  var version = result.output
  // events.emit('log', 'Version for path:', path, version)
  return version.replace(/\n/g, '');
};

State.addOrUpdatePlatformToPackageJson = function addOrUpdatePlatformToPackageJson(packageJson, platformId, platformInfo) {
  // var platformExists = _.findWhere(packageJson.cordovaPlatforms, {platform: platformId});
  var existingPlatform;

  if (typeof platformInfo === 'undefined') {
    platformInfo = platformId;
  }

  var existingPlatformIndex;

  for (var i = 0, j = packageJson.cordovaPlatforms.length; i < j; i++) {
    if (typeof packageJson.cordovaPlatforms[i] == 'string' && packageJson.cordovaPlatforms[i] == platformId) {
      existingPlatform = packageJson.cordovaPlatforms[i];
      existingPlatformIndex = i;
      break;
    } else if (packageJson.cordovaPlatforms[i].platform == platformId) {
      existingPlatform = packageJson.cordovaPlatforms[i];
      existingPlatform.locator = platformInfo.locator;
      existingPlatformIndex = i;
      break;
    }
  }

  if (!existingPlatform) {
    packageJson.cordovaPlatforms.push(platformInfo);
  } else if (platformInfo) {
    events.emit('verbose', 'A platform already exists - now updating the entry:', existingPlatform, platformInfo);
    packageJson.cordovaPlatforms[existingPlatformIndex] = platformInfo;
  }


  // events.emit('log', 'platformExists:', platformExists)
  // if (!platformExists && requiresLocator) {
  //   packageJson.cordovaPlatforms.push({platform: platform, locator: locator});
  //   // packageJson.cordovaPlatforms.push({platform: platform, version: version, locator: locator});
  // } else if (!platformExists && !requiresLocator) {
  //   packageJson.cordovaPlatforms.push(platform);
  // } else {
  //   platformExists.platform = platform
  //   platformExists.locator = locator
  // }
};

State.savePlatform = function savePlatform(appDirectory, locator) {
  events.emit('verbose', 'State.savePlatform', appDirectory, locator);
  // Locator may be:
  // Name:        ios, android
  // Name with version: ios@3.8.0, android@4.0.0
  // Local path:  ./engine/cordova-android-c0.6.1
  // Http url:    https://github.com/apache/cordova-android.git
  // events.emit('log', 'platform args:', platformArgs);
  // var locator = platformArgs._[2];
  var platform = 'ios',
      version;
  var packageJson = State.getPackageJson(appDirectory);

  //Test to see if its just ios or android
  if (locator === 'ios' || locator === 'android') {
    platform = locator;
    State.addOrUpdatePlatformToPackageJson(packageJson, platform);
    return State.savePackageJson(appDirectory, packageJson);
  }


  if (locator.indexOf('@') != -1) {
    //platform add ios@3.8.0
    var locatorSplits = locator.split('@');
    platform = locatorSplits[0];
    version = locatorSplits[1];
  } else {
    //platform add ./some/path/ios
    platform = locator.indexOf('ios') != -1 ? 'ios' : 'android';
  }

  var platformInfo = {
    platform: platform,
    version: version,
    locator: locator
  };

  State.addOrUpdatePlatformToPackageJson(packageJson, platform, platformInfo);

  State.savePackageJson(appDirectory, packageJson);

};

State.savePackageJson = function savePackageJson(appDirectory, packageJsonData) {
  events.emit('verbose', 'State.savePackageJson', appDirectory, packageJsonData);
  try {
    var packageJsonPath = path.join(appDirectory, 'package.json');
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonData, null, 2));
  } catch (e) {
    events.emit('log', ('Error saving ' + packageJsonPath + ': ' + e).bold);
  }
};

State.restoreState = function restoreState(appDirectory, options) {

  events.emit('verbose', 'State.restoreState', appDirectory, options);
  if (!options || !appDirectory) {
    throw 'You must pass an application directory and options to restore state.';
  }

  if (!options.platforms && !options.plugins) {
    events.emit('log', 'You must specify either platforms or plugins to restore the state of your Ionic application.');
    return;
  }

  events.emit('log', 'Attempting to restore your Ionic application from package.json\n'.yellow.bold);

  // var packageJsonPath = path.join(appDirectory, 'package.json');
  // var packageJson = require(packageJsonPath);
  var packageJson = State.getPackageJson(appDirectory);
  var restorePromise;

  if (options.platforms) {
    events.emit('log', 'Restoring Platforms\n'.blue.bold)

    restorePromise = State.restorePlatforms(appDirectory, packageJson)
    .then(function() {
      events.emit('log', '\nRestore platforms is complete\n'.green.bold);
    });
  } else {
    restorePromise = Q();
  }


  return restorePromise
  .then(function() {
    if (options.plugins) {
      events.emit('log', '\rRestoring Plugins\n'.blue.bold)
      return State.restorePlugins(appDirectory, packageJson)
      .then(function(){
        events.emit('log', 'Restore plugins is complete\n'.green.bold);
      });
    } else {
      return Q();
    }
  })
  .then(function() {
    events.emit('log', 'Ionic state restore completed\n'.blue.bold)
  })
  .catch(function(ex) {
    events.emit('log', 'Ionic state restore failed\n'.red.bold)
    events.emit('log', ex ,ex.stack);
  });
};

State.restorePlugins = function restorePlugins(appDirectory, packageJson) {
  events.emit('verbose', 'State.restorePlugins', appDirectory, packageJson);
  var q = Q.defer();
  State.processPlugin(appDirectory, 0, packageJson, q);
  return q.promise;
};

State.restorePlatforms = function restorePlatforms(appDirectory, packageJson) {
  events.emit('verbose', 'State.restorePlatforms', appDirectory, packageJson);
  var q = Q.defer();

  State.processPlatform(appDirectory, 0, packageJson, q);

  return q.promise;
};

State.processPlatform = function processPlatform(appDirectory, index, packageJson, promise) {
  if (index >= packageJson.cordovaPlatforms.length) {
    promise.resolve();
    return
  }

  try {
    // events.emit('log', 'processing platform', index, packageJson)
    var platform = packageJson.cordovaPlatforms[index];
    var platformCommand;

    if (typeof platform == 'string') {
      platformCommand = ['cordova platform add ', platform].join('')
    } else {
      //Here, they have either a special version, or locator for
      //local install or github install
      platformCommand = 'cordova platform add ' + platform.locator;
    }
    // var platformCommand = State.createAddRemoveStatement(platform);
    events.emit('log', platformCommand);
    exec(platformCommand, function() {
        State.processPlatform(appDirectory, index + 1, packageJson, promise);
    });
  } catch (ex) {
    events.emit('log', 'An error happened processing the previous cordova plugins')
    events.emit('log', 'Error:', ex)
    promise.reject(ex)
  }
};

State.createAddRemoveStatement = function createAddRemoveStatement(plugin) {
    // events.emit('log', 'Creating add/remove statement', plugin)
    try {
      var pluginCmd = 'cordova plugin add ';
      if (typeof plugin === 'string') {
        pluginCmd += plugin;
      } else {
        pluginCmd += plugin.locator + ' ';
        if (plugin.variables) {
            Object.keys(plugin.variables).forEach(function(variable) {
                pluginCmd += '--variable ' + variable + '="' + plugin.variables[variable] + '" ';
            });
        }
      }
    } catch (ex) {
      events.emit('log', 'Failed to create add plugin statement:', ex)
    }

    // events.emit('log', 'plugin cmd', pluginCmd)

    return pluginCmd;
};

State.processPlugin = function processPlugin(appDirectory, index, packageJson, promise) {
  if (index >= packageJson.cordovaPlugins.length) {
    promise.resolve();
    return
  }
  try {
    // events.emit('log', 'processing plugin', index, packageJson)
    var plugin = packageJson.cordovaPlugins[index];
    var pluginCommand = State.createAddRemoveStatement(plugin);
    events.emit('log', pluginCommand);
    exec(pluginCommand, function() {
        State.processPlugin(appDirectory, index + 1, packageJson, promise);
    });
  } catch (ex) {
    events.emit('log', 'An error happened processing the previous cordova plugins')
    events.emit('log', 'Error:', ex)
    promise.reject(ex)
  }
};

State.removePlatform = function removePlatform(appDirectory, platform) {
  // events.emit('log', 'Args:', platformArgs);
  //Expecting - ionic platform remove [ios|android]

  //TODO - check if they pass multiple platforms
  //ionic platform remove ios android

  var packageJson = State.getPackageJson(appDirectory),
      platformEntry;

  for (var i = 0, j = packageJson.cordovaPlatforms.length; i < j; i++) {
    platformEntry = packageJson.cordovaPlatforms[i];
    if (typeof platformEntry === 'string' && platformEntry == platform) {
      packageJson.cordovaPlatforms.splice(i, 1);
      break;
    } else if (platformEntry.platform == platform) {
      //Its object {platform: 'android', locator: './engine/cordova-android'}
        packageJson.cordovaPlatforms.splice(i, 1);
        break;
    }
  }

  State.savePackageJson(appDirectory, packageJson);
};

State.getPluginParameters = function getPluginParameters(configXmlData, pluginName) {
  if (!configXmlData || !configXmlData.widget || !configXmlData.widget.feature) {
    throw 'Invalid Config XML Data';
  }

  var features = configXmlData.widget.feature,
      feature;

  features.forEach(function(potFeature) {
    if (potFeature.$.name == pluginName) {
      feature = potFeature
    }
  })

  if (feature && feature.param) {
    return feature.param
  }

  return null;
};

//
/**
* Used after `ionic plugin add <id|locator>` to save the plugin
* to package.json and config.xml.
* @pluginArgs  {Object} contains the command line args passed
* from the ionic command.
* { _: [ 'plugin', 'add', '../phonegap-facebook-plugin' ],
  variable: [ 'APP_ID=123456789', 'APP_NAME=myApplication' ],
  '$0': '/usr/local/bin/ionic' }
*/
State.savePlugin = function savePlugin(appDirectory, pluginId, variables) {
  events.emit('verbose', 'State.savePlugin - appDirectory:', appDirectory, 'pluginId', pluginId, 'variables', variables);
  //Expects - either simple ID for plugin registry
  //or a local path, with or without variables
  //ionic plugin add org.apache.cordova.splashscreen
  //ionic plugin add ../phonegap-facebook-plugin --variable APP_ID="123456789" --variable APP_NAME="myApplication"

  //With a local file locator, we can look at the plugin.xml as it exists
  //If its a git resource locator, we'll have to look at fetch.json
  //Idea: this is run after platform add/rm is done

  var packageJson = State.getPackageJson(appDirectory),
      pluginInfo = {},
      plugin;

  // pluginId could be org.ionic.keyboard or ./engine/facebook-plugin
  if (pluginId.indexOf('/') === -1) { //its just an id
    State.addOrUpdatePluginToPackageJson(packageJson, pluginId);
    return State.savePackageJson(appDirectory, packageJson);
  }

  //By here, we know its not a registry plugin (git/local)
  //Its a locator, local file path or https://github.com repo
  pluginInfo.locator = pluginId;
  pluginInfo.id = pluginId = State.getPluginFromFetchJsonByLocator(appDirectory, pluginInfo.locator);

  //If there are no variables, we just add to package, then save
  if (!variables) {
    State.addOrUpdatePluginToPackageJson(packageJson, pluginId, pluginInfo);
    return State.savePackageJson(appDirectory, packageJson);
  }

  //Check and save for variables
  pluginInfo.variables = {};
  for (var i = 0, j = variables.length; i < j; i++)  {
    //variable: [ 'APP_ID=123456789', 'APP_NAME=myApplication' ]
    var splits = variables[i].split('=');
    pluginInfo.variables[splits[0]] = splits[1];
  }

  State.addOrUpdatePluginToPackageJson(packageJson, pluginId, pluginInfo);
  events.emit('log', 'Save plugin to package.json completed');

  //By now we assume pluginId is set, and locator might be set.
  return State.savePackageJson(appDirectory, packageJson);
};

State.removePlugin = function removePlugin(appDirectory, pluginId) {
  events.emit('verbose', 'State.removePlugin - ', appDirectory, pluginId);
  var packageJson = State.getPackageJson(appDirectory);
  for (var i = 0, j = packageJson.cordovaPlugins.length; i < j; i++) {
    if (typeof packageJson.cordovaPlugins[i] == 'string' && packageJson.cordovaPlugins[i] == pluginId) {
      packageJson.cordovaPlugins.splice(i, 1);
      break;
    } else if (packageJson.cordovaPlugins[i].id == pluginId) {
      packageJson.cordovaPlugins.splice(i, 1);
      break;
    }
  }

  State.savePackageJson(appDirectory, packageJson);
};

State.saveXmlFile = function saveXmlFile(xmlData, xmlPath) {
  try {
    var xml2js = require('xml2js');
    var xmlBuilder = new xml2js.Builder();
    var configString = xmlBuilder.buildObject(xmlData);
    fs.writeFileSync(xmlPath, configString);
  } catch (ex) {
    events.emit('log', 'Could not save your xml file to path:', xmlPath);
  }
};

State.getPluginFromFetchJsonByLocator = function getPluginFromFetchJsonByLocator(appDirectory, pluginLocator) {
  var fetchJson = require(path.join(appDirectory, 'plugins', 'fetch.json')),
    lookupId,
    lookupPlugin,
    isNotRegistyPlugin,
    hasUrlOrPathOfLocator,
    pluginId,
    ref;

  if (pluginLocator.indexOf('#') !== -1) {
    //We have https://github.com/apache/cordova-plugin-whitelist.git#r1.0.0
    var pluginSplits = pluginLocator.split('#');
    pluginLocator = pluginSplits[0];
    ref = pluginSplits[1];
  }

  for (lookupId in fetchJson) {
    lookupPlugin = fetchJson[lookupId];
    isNotRegistyPlugin = lookupPlugin.source.type && lookupPlugin.source.type != 'registry';
    hasUrlOrPathOfLocator = lookupPlugin.source.path == pluginLocator || lookupPlugin.source.url == pluginLocator;
    hasPathWithLeadingDot = lookupPlugin.source && typeof lookupPlugin.source == 'string' && lookupPlugin.source.replace('./', '') == pluginLocator

    if ((isNotRegistyPlugin && hasUrlOrPathOfLocator) || (isNotRegistyPlugin && hasPathWithLeadingDot)) {
      pluginId = lookupId;
      break;
    }
  }

  return pluginId;
};

State.checkAndSaveConfigXml = function checkAndSaveConfigXml(appDirectory, pluginId) {
  //Now we have as an array:
  // <param name="id" value="com.phonegap.plugins.facebookconnect"/>
  // <param name="installPath" value="../phonegap-facebook-plugin"/>
  // <param name="APP_ID" value="616451688482285"/>
  // <param name="APP_NAME" value="hybrid-app"/>

  //Check to see if platforms exist
  //bug with cordova is, it doesnt add the entry into
  //config.xml unless a platform has been added.
  var configXmlPath = path.join(appDirectory, 'config.xml');
  var pluginXmlPath = path.join(appDirectory, 'plugins', pluginId, 'plugin.xml');

  var pluginXmlData = State.getXmlData(pluginXmlPath);
  var configXmlData = State.getXmlData(configXmlPath);

  // events.emit('log', 'xml data:', pluginXmlData);

  var pluginName = pluginXmlData.plugin.name[0],
      feature,
      param,
      paramName;

  var params = State.getPluginParameters(configXmlData, pluginName);
  if (!params) {
    //We need to add them
    feature = {'$': { name: pluginName }, param: [] };

    if (!configXmlData.widget.feature) {
      configXmlData.widget.feature = [];
    }

    for (paramName in pluginInfo.variables) {
      //Go thru vars and add to param
      param = { '$': { name: paramName, value: pluginInfo.variables[paramName] } };
      feature.param.push(param);
    }

    configXmlData.widget.feature.push(feature);

    State.saveXmlFile(configXmlData, configXmlPath);
  }
};

State.resetState = function resetState(appDirectory, options) {
  var platformPath = path.join(appDirectory, 'platforms');
  var pluginPath = path.join(appDirectory, 'plugins');
  shelljs.rm('-rf', [platformPath, pluginPath]);
  events.emit('log', 'Removed platforms and plugins'.blue.bold);
  State.restoreState(appDirectory, options)
  .then(function() {
    events.emit('log', 'Ionic reset state complete'.green.bold);
  })
};

State.clearState = function clearState(appDirectory) {
  events.emit('log', 'Clearing out your Ionic app of platforms, plugins, and package.json entries'.blue.bold);
  var platformPath = path.join(appDirectory, 'platforms');
  var pluginPath = path.join(appDirectory, 'plugins');
  shelljs.rm('-rf', [platformPath, pluginPath]);

  var packageJson = State.getPackageJson(appDirectory);
  packageJson.cordovaPlatforms = packageJson.cordovaPlugins = [];
  State.savePackageJson(appDirectory, packageJson);
  events.emit('log', 'Ionic app state cleared'.green.bold);
};

State.getPluginsFromFetchJson = function getPluginsFromFetchJson(appDirectory) {
  var fetchJson,
      plugin,
      pluginId,
      installedPlugins = {},
      pluginPath,
      pluginPathStats,
      pluginXmlPath,
      pluginXml,
      pluginDescription,
      pluginName;

  try {
    fetchJson = require(path.join(appDirectory, 'plugins', 'fetch.json'));
  } catch (ex) {
    //Error - no fetch.json exists.
    return [];
  }

  try {
    for (pluginId in fetchJson) {
      plugin = fetchJson[pluginId];

      try {
        pluginPath = path.join(appDirectory, 'plugins', pluginId);
        pluginPathStats = fs.statSync(pluginPath);
      } catch (ex) {
        events.emit('log', ['Plugin', pluginId, 'does not exist in the plugins directory. Skipping'].join(' ').yellow);
        continue;
      }

      if (pluginPathStats && !pluginPathStats.isDirectory()) {
        events.emit('log', ['Plugin', pluginId, 'does not exist in the plugins directory. Skipping'].join(' ').yellow);
        continue;
      }

      pluginXmlPath = path.join(appDirectory, 'plugins', pluginId, 'plugin.xml');
      pluginXml = State.getXmlData(pluginXmlPath)

      pluginDescription = pluginXml.plugin.description[0];
      pluginName = pluginXml.plugin.name[0];

      var displayText = pluginDescription.length >= 40 ? pluginName : pluginDescription;
      // var displayText = pluginDescription.length > pluginName.length ? pluginName : pluginDescription;

      installedPlugins[pluginId] = {id: pluginId, name: pluginName, description: pluginDescription, displayText: displayText};

    }//closes for loop for fetch.json
  } catch (ex) {
    Utils.fail('Error occurred retrieving installed plugins', ex);
    // throw ex;
  }
  return installedPlugins;
}
