var chalk = require('chalk');
var argv = require('optimist').boolean(['nohooks', 'n', 'r', 'noresources', 'nosave', 'e']).argv;
var cordova = require('cordova-lib').cordova.raw;
var exec = require('child_process').exec;
var State = require('./state');
var Q = require('q');
var log = require('./logging').logger;

var Cordova = module.exports;

Cordova.Lib = require('cordova-lib');

Cordova.runCordova = function runCordova(cmdName) {
  var deferred = Q.defer();
  var self = this;
  var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []);
  var cmdArg;
  var x;
  var y;

  // backwards compatibility prior to fully wrapping cordova cmds
  if (cmdName === 'platform') {

    // `ionic platform <PLATFORM>` used to actually run `ionic platform add <PLATFORM>`
    // if a cordova platform cmd isn't the cmd then automatically insert `add`
    var hasCordovaCmd = false;
    var validCommands = 'add remove rm list ls update up check'.split(' ');

    for (x = 0; x < cmdArgs.length; x += 1) {
      cmdArg = cmdArgs[x].toLowerCase();
      for (y = 0; y < validCommands.length; y += 1) {
        if (cmdArg === validCommands[y]) {
          hasCordovaCmd = true;
          break;
        }
      }
    }

    if (!hasCordovaCmd) {
      cmdArgs.unshift('add');
    }
  }

  cmdArgs.unshift(cmdName);

  // clean out any cmds that may confuse cordova
  var cleanArgs = [];
  var port = argv.port || argv.p || '';
  var liveReloadPort = argv.livereloadport || argv['livereload-port'] || argv.r || '';
  var ignoreCmds = '--livereload -l --consolelogs -c --serverlogs -s --port -p --livereload-port -i -r'.split(' ');
  var isValdCmd;

  for (x = 0; x < cmdArgs.length; x += 1) {
    cmdArg = cmdArgs[x];
    if (port && cmdArg === port) continue;
    if (liveReloadPort && cmdArg === liveReloadPort) continue;
    isValdCmd = true;
    for (y = 0; y < ignoreCmds.length; y += 1) {
      if (cmdArg === ignoreCmds[y]) {
        isValdCmd = false;
        break;
      }
    }
    if (isValdCmd) {

      // make sure --target= has double quotes around it (process.argv removes them)
      if (cmdArg.indexOf('--target=') === 0 && cmdArg.indexOf('"') === -1) {
        cmdArg = cmdArg.replace('--target=', '--target="') + '"';
      }

      cleanArgs.push(cmdArg);
    }
  }

  var cordovaProcess = exec('cordova ' + cleanArgs.join(' '));

  cordovaProcess.stdout.on('data', function(data) {
    process.stdout.write(data);
  });

  cordovaProcess.stderr.on('data', function(data) {
    if (data) {
      process.stderr.write(chalk.red.bold(data.toString()));
    }
  });

  cordovaProcess.on('close', function(code) {
    deferred.resolve(code);
  });

  if (self.isLiveReload) {
    cordovaProcess.on('exit', function() {
      setTimeout(function() {

        // set it back to the original src after a few seconds
        self.ionic.setConfigXml({
          resetContent: true,
          errorWhenNotFound: true
        });
      }, 5000);
    });

    process.on('exit', function() {

      // verify it was set back
      self.ionic.setConfigXml({
        resetContent: true,
        errorWhenNotFound: false
      });
    });

    var readLine = require('readline');
    if (process.platform === 'win32') {
      var rl = readLine.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.on('SIGINT', function() {
        process.emit('SIGINT');
      });
    }

    process.on('SIGINT', function() {
      process.exit();
    });
  }

  return deferred.promise;
};

Cordova.setupLiveReload = function() {
  var d = Q.defer();

  log.info('Setup Live Reload');

  var self = this;
  var Serve = require('./serve');
  var serveInstance = new Serve();
  var serveTask = new serveInstance.IonicTask();
  serveTask.ionic = this.ionic;
  serveTask.isPlatformServe = true;

  serveTask.loadSettings();

  serveTask.getAddress()
  .then(function() {
    return serveTask.checkPorts(true, serveTask.port, serveTask.address);
  })
  .then(function() {
    if (serveTask.runLivereload) {
      return serveTask.checkPorts(false, serveTask.liveReloadPort, serveTask.address);
    }
  })
  .then(function() {

    serveTask.runLivereload = true;
    serveTask.launchBrowser = false;
    serveTask.launchLab = false;
    serveTask.start(self.ionic);

    if (self.ionic.hasFailed) return;

    self.ionic.setConfigXml({
      devServer: serveTask.devServer
    }).then(function() {
      d.resolve();
    });
  })
  .catch(function(error) {
    console.log(error);
  });

  return d.promise;
};


Cordova.addPlatform = function addPlatform(projectRoot, platform, savePlatform) {
  log.debug('Cordova.addPlatform: ', projectRoot, platform, savePlatform);

  // var opts = {
  //   searchpath : args.searchpath
  //   , noregistry : args.noregistry
  //   , usegit : args.usegit
  //   , cli_variables : cli_vars
  //   , browserify: args.browserify || false
  //   , link: args.link || false
  //   , save: args.save || false
  //   , shrinkwrap: args.shrinkwrap || false
  // };
  var options = {
    stdio: 'pipe'
  };

  var originalPwd = process.env.PWD;
  process.env.PWD = projectRoot;

  return cordova.platform('add', [platform], options)
    .then(function() {

      process.env.PWD = originalPwd;
      if (savePlatform) {
        log.debug('Cordova.addPlatform call specified to save platform. Saving to package.json now.');
        return State.savePlatform(projectRoot, platform);
      }
    });
};

Cordova.removePlatform = function removePlatform(projectRoot, platform, savePlatform) {
  var options = {};
  var originalPwd = process.env.PWD;
  process.env.PWD = projectRoot;

  return cordova.platform('remove', [platform], options)
  .then(function() {
    process.env.PWD = originalPwd;
    if (savePlatform) {
      return State.removePlatform(projectRoot, platform);
    }
  });
};

Cordova.runPlatform = function runPlatform(projectRoot, platform) {
  var options = {
    platforms: [],
    options: [],
    verbose: false,
    silent: false,
    browserify: false,
    stdio: 'pipe'
  };

  options.platforms.push(platform);

  var originalPwd = process.env.PWD;
  process.env.PWD = projectRoot;
  return cordova.run(options)
  .then(function() {
    process.env.PWD = originalPwd;
  })
  .catch(function(error) {
    throw error;
  });
};


Cordova.addPlugin = function addPlugin(projectRoot, pluginId, pluginVariables, savePlugin) {
  log.debug('Cordova.addPlugin: projectRoot', projectRoot, 'pluginId', pluginId,
            'pluginVariables', pluginVariables, 'savePlugin', savePlugin);
  var originalPwd = process.env.PWD;
  process.env.PWD = projectRoot;

  // If you need to pass variables,
  // target should be an array of [plugin_id, '--variable', 'VARNAME=value']
  // require('cordova-lib').cordova.raw.plugin('add', target)
  return cordova.plugin('add', pluginId, { stdio: 'pipe' })
  .then(function() {
    process.env.PWD = originalPwd;
    if (savePlugin) {
      State.savePlugin(projectRoot, pluginId, pluginVariables);
    }
  })
  .catch(function(error) {
    log.error('Error occurred while adding plugin: ', error);
    throw error;
  });
};

Cordova.removePlugin = function removePlugin(projectRoot, pluginId) {
  var originalPwd = process.env.PWD;
  process.env.PWD = projectRoot;

  return cordova.plugin('remove', pluginId, { stdio: 'pipe' })
  .then(function() {
    process.env.PWD = originalPwd;
  })
  .catch(function(error) {
    throw error;
  });
};

Cordova.buildPlatform = function buildPlatform(projectRoot, platform) {
  var options = {
    platforms: [],
    options: [],
    verbose: false,
    silent: false,
    browserify: false,
    stdio: 'pipe'
  };

  options.platforms.push(platform);

  var originalPwd = process.env.PWD;
  process.env.PWD = projectRoot;
  return cordova.build(options)
  .then(function() {
    process.env.PWD = originalPwd;
  })
  .catch(function(error) {
    throw error;
  });
};

Cordova.preparePlatform = function preparePlatform(projectRoot, platform) {
  var options = {
    platforms: [],
    options: [],
    verbose: false,
    silent: false,
    browserify: false,
    stdio: 'pipe'
  };

  options.platforms.push(platform);

  var originalPwd = process.env.PWD;
  process.env.PWD = projectRoot;
  return cordova.prepare(options)
  .then(function() {
    process.env.PWD = originalPwd;
  })
  .catch(function(error) {
    throw error;
  });
};
