var fs = require('fs');
var path = require('path');
var shelljs = require('shelljs');
var log = require('./logging').logger;

var Hooks = module.exports;

shelljs.config.silent = true;

Hooks.addCliHookDirectory = function addCliHookDirectory(appDirectory, cliHookPath, hookDirectoryName) {
  fs.readdir(cliHookPath, function(err, files) {

    // loop through each of the scripts in the ionic-cli hook directory
    if (err) return;
    for (var x = 0; x < files.length; x += 1) {
      var hookFilename = files[x];
      if (hookFilename.indexOf('.js') === -1) return;

      // check if this hook script has already been added to this ionic project
      Hooks.addHookScript(appDirectory, cliHookPath, hookDirectoryName, hookFilename);
    }
  });
};

Hooks.addHookScript = function addHookScript(appDirectory, cliHookPath, hookDirectoryName, hookFilename) {

  // add the root hooks directory if the project doesn't have it
  try {
    var projectHookPath = path.join(appDirectory, 'hooks');
    if (!fs.existsSync(projectHookPath)) {
      fs.mkdirSync(projectHookPath);
    }

    // add the hook directory (ie: after_prepare) if the project doesn't have it
    projectHookPath = path.join(projectHookPath, hookDirectoryName);
    if (!fs.existsSync(projectHookPath)) {
      fs.mkdirSync(projectHookPath);
    }

    var projectScript = path.join(projectHookPath, hookFilename);
    if (!fs.existsSync(projectScript)) {

      // copy the hook script to the project
      try {
        var cliScript = path.join(cliHookPath, hookFilename);
        fs.writeFileSync(projectScript, fs.readFileSync(cliScript));
      } catch (e) {
        log.error('addCliHookDirectory fs.createReadStream: %', e, {});
        return;
      }
    }

    // make the script file executable
    try {
      fs.chmodSync(projectScript, '755');
    } catch (e) {
      log.error('addCliHookDirectory fs.chmodSync: %s', e, {});
    }

  } catch (e) {
    log.error('Error adding hook script ' + hookDirectoryName + '/' + hookFilename + ', %s', e, {});
  }
};

Hooks.add = function add(appDirectory) {
  log.info('Adding in default Ionic Cordova hooks');

  // Add hooks which this Ionic project doesn't already have
  // note: hook scripts must be executable!

  if (!fs.existsSync(path.join(appDirectory, 'www'))) {

    // don't both doing any of this if they aren't
    // in the correct working directory, which would have `www`
    return;
  }

  // loop through all the hook directories added to the ionic-cli
  var cliHooksPath = path.join(__dirname, './hooks');

  fs.readdir(cliHooksPath, function(err, files) {
    if (err) return;

    for (var x = 0; x < files.length; x += 1) {
      if (files[x].indexOf('.') > -1) continue;
      Hooks.addCliHookDirectory(appDirectory, path.join(cliHooksPath, files[x]), files[x]);
    }
  });

  log.info('Added default Ionic Cordova hooks');
};

Hooks.remove = function remove(appDirectory) {
  log.info('Removing the Ionic Cordova plugin hooks');
  var oldPluginHooks = [
    'after_platform_add/010_install_plugins.js',
    'after_plugin_add/010_register_plugin.js',
    'after_plugin_rm/010_deregister_plugin.js'
  ];

  oldPluginHooks.forEach(function(hook) {
    try {
      var hookPath = path.join(appDirectory, 'hooks', hook);
      fs.unlinkSync(hookPath);
    } catch (ex) {} // eslint-disable-line no-empty
  });

  log.info('Removed the Ionic Cordova hooks');
};


Hooks.setHooksPermission = function setHooksPermission(appDirectory) {

  // Go through `hooks` directory - after_prepare
  // for each directory, go into the directories of that path
  // For each path, set permission on file
  try {
    var hooksPath = path.join(appDirectory, 'hooks');

    var hooksDirs = fs.readdirSync(hooksPath);
    var hookDirPath;
    var hookStats;
    var hooksInDir;

    hooksDirs.forEach(function(hookDir) {
      hookStats = fs.statSync(path.join(hooksPath, hookDir));
      if (!hookStats.isDirectory()) return;
      hookDirPath = path.join(hooksPath, hookDir); // after_prepare
      hooksInDir = fs.readdirSync(hookDirPath);

      hooksInDir.forEach(function(hook) {

        // make the script file executable
        try {
          fs.chmodSync(path.resolve(hooksPath, hookDir, hook), '755');
        } catch (e) {
          log.error('Hooks.setHooksPermission fs.chmodSync: %s', e, {});
        }
      });
    });
  } catch (ex) {
    log.error('Error: %s', ex);
  }

  log.debug('Updated the hooks directory to have execute permissions');
};
