var path = require('path');
var fs = require('fs');
var spawn = require('cross-spawn');
var semver = require('semver');
var log = require('./logging').logger;
var Q = require('q');
var osName = require('os-name');

var Info = module.exports;


// Yes please treat this as a singleton
var allEnvironmentInfo = {};


var requirements = {
  node: '>=0.12.x',
  cordova: '>=4.2.0'
};

/**
 * Get contents of a json file
 */
function getPackageJsonContents(packageJsonPath) {
  var deferred = Q.defer();
  var packageJson = {};

  try {
    fs.readFile(packageJsonPath, 'utf8', function(err, dataString) {
      if (!err) {
        packageJson = JSON.parse(dataString);
      }
      deferred.resolve(packageJson);
    });
  } catch (e) {
    deferred.resolve(packageJson);
  }

  return deferred.promise;
}

/**
 * Get output from a shell command
 */
function getCommandInfo(cmd, args) {
  var deferred = Q.defer();
  var info = '';

  try {
    var proc = spawn(cmd, args);

    proc.stdout.on('data', function(data) {
      info += data.toString('utf8');
    });

    proc.on('error', function() {
      deferred.resolve('Not installed');
    });

    proc.on('close', function(code) {
      if (code !== 0) {
        return deferred.resolve('Not installed');
      }
      deferred.resolve(info.replace('\n', ' '));
    });
  } catch (e) {
    return deferred.resolve('Not installed');
  }

  return deferred.promise;
}

function getCliInfo() {
  var packageJsonPath = path.resolve(
    path.dirname(require.main.filename),
    '..',
    'package.json'
  );

  return getPackageJsonContents(packageJsonPath);
}

function getIonicAppLibVersion() {
  var packageJsonPath = path.resolve(
    __dirname,
    '..',
    'package.json'
  );

  return getPackageJsonContents(packageJsonPath);
}

function getAppScriptsInfo() {
  var packageJsonPath = path.resolve(
    process.cwd(),
    'node_modules',
    '@ionic/app-scripts',
    'package.json'
  );

  return getPackageJsonContents(packageJsonPath);
}

function getIonicVersion() {
  var baseDir = process.cwd();

  return Q.allSettled([
    getPackageJsonContents(path.resolve(baseDir, 'node_modules', 'ionic-angular', 'package.json')),
    getPackageJsonContents(path.resolve(baseDir, 'node_modules', 'ionic-framework', 'package.json')),
    getPackageJsonContents(path.resolve(baseDir, 'www', 'lib', 'ionic', 'version.json')),
    getPackageJsonContents(path.resolve(baseDir, 'www', 'lib', 'ionic', 'bower.json'))
  ]).then(function(results) {
    var json = null;
    results.every(function(result) {
      if (result.value && result.value.hasOwnProperty('version')) {
        json = result.value;
        return false;
      }
    });
    return json;
  });
}

Info.gatherInfo = function gatherInfo() {
  if (Object.keys(allEnvironmentInfo).length > 0) {
    return Q.resolve(allEnvironmentInfo);
  }

  function getPackageJsonVersion(json) {
    return (json && json.hasOwnProperty('version')) ? json['version'] : null; 
  }

  return Q.allSettled([
    getCommandInfo('cordova', ['-v']),
    getCommandInfo('/usr/bin/xcodebuild', ['-version']),
    getCommandInfo('ios-deploy', ['--version']),
    getCommandInfo('ios-sim', ['--version']),
    getCliInfo(),
    getIonicAppLibVersion(),
    getIonicVersion(),
    getAppScriptsInfo(),
    Q.resolve(process.version),
    Q.resolve(osName())
  ]).then(function(results) {
    results = results.map(function(result) {
      return result.value;
    });
    allEnvironmentInfo = {
      cordova: results[0],
      xcode: results[1],
      ios_deploy: results[2], // eslint-disable-line camelcase
      ios_sim: results[3], // eslint-disable-line camelcase
      ionic_cli: getPackageJsonVersion(results[4]), // eslint-disable-line camelcase
      ionic_lib: getPackageJsonVersion(results[5]), // eslint-disable-line camelcase
      ionic: getPackageJsonVersion(results[6]),
      ionic_app_scripts: getPackageJsonVersion(results[7]), // eslint-disable-line camelcase
      node: results[8],
      os: results[9]
    };
    return allEnvironmentInfo;
  });
};

Info.printInfo = function printInfo(info) {
  log.info('\nYour system information:\n');

  log.info('Cordova CLI:', info.cordova);
  if (info.gulp) {
    log.info('Gulp version:', info.gulp);
    log.info('Gulp local: ', info.gulp_local);
  }

  if (info.ionic) {
    log.info('Ionic Framework Version:', info.ionic);
  }

  if (info.ionic_cli) {
    log.info('Ionic CLI Version:', info.ionic_cli);
  }

  if (info.ionic_lib) {
    log.info('Ionic App Lib Version:', info.ionic_lib);
  }

  if (info.ionic_app_scripts) {
    log.info('Ionic App Scripts Version:', info.ionic_app_scripts);
  }

  if (info.ios_deploy) {
    log.info('ios-deploy version:', info.ios_deploy);
  }

  if (info.ios_sim) {
    log.info('ios-sim version:', info.ios_sim);
  }

  log.info('OS:', info.os);
  log.info('Node Version:', info.node);

  if (info.xcode) {
    log.info('Xcode version:', info.xcode);
  }

  log.info('\n');
};

Info.checkRuntime = function checkRuntime(info) {
  var iosDeployInstalled = false;
  var iosSimInstalled = false;
  var cordovaInstalled = false;
  var cordovaUpgrade = false;
  var nodeUpgrade = false;
  var validRuntime = true;

  try {
    nodeUpgrade = !semver.satisfies(info.node, requirements.node);
    cordovaUpgrade = !semver.satisfies(info.cordova, requirements.cordova);
    cordovaInstalled = true; // if it throws above, we know cordova is not installed
  } catch (ex) {} // eslint-disable-line no-empty

  log.debug('System Info:', info);

  if (info.ios_sim !== 'Not installed') {
    iosSimInstalled = true;
  }
  if (info.ios_deploy !== 'Not installed') {
    iosDeployInstalled = true;
  }

  var checkOsx = process.platform === 'darwin';

  var checkOsxDeps = checkOsx && (!iosSimInstalled || !iosDeployInstalled);

  var showDepdencyWarning = nodeUpgrade || (!cordovaInstalled || cordovaUpgrade) || checkOsxDeps;

  if (showDepdencyWarning) {
    log.warn('******************************************************');
    log.warn(' Dependency warning - for the CLI to run correctly,      ');
    log.warn(' it is highly recommended to install/upgrade the following:     ');
    log.warn('');

    if (nodeUpgrade) {
      var updateMessage = [' Please update your Node runtime to version ', requirements.node].join(' ');
      log.warn(updateMessage);
      validRuntime = false;
    }

    if (!cordovaInstalled || cordovaUpgrade) {
      var action = cordovaInstalled ? 'update' : 'install';
      updateMessage = [' Please', action, 'your Cordova CLI to version ',
        requirements.cordova, '`npm install -g cordova`'].join(' ');
      log.warn(updateMessage);
      validRuntime = false;
    }

    if (info.ios_sim === 'Not installed' && process.platform === 'darwin') {
      log.warn(' Install ios-sim to deploy iOS applications.' +
               '`npm install -g ios-sim` (may require sudo)');
    }
    if (info.ios_deploy === 'Not installed' && process.platform === 'darwin') {
      log.warn(' Install ios-deploy to deploy iOS applications to devices. ' +
               ' `npm install -g ios-deploy` (may require sudo)');
    }

    log.warn('');
    log.warn('******************************************************');
  }

  return validRuntime;
};

Info.run = function run() {
  return Info.gatherInfo().then(function(info) {
    Info.printInfo(info);
    Info.checkRuntime(info);
  });
};
