var path = require('path');
var shelljs = require('shelljs');
var os = require('os');
var semver = require('semver');
var log = require('./logging').logger;

var Info = module.exports;

var requirements = {
  node: '>=0.12.x',
  cordova: '>=4.2.0'
};

Info.getMacInfo = function getMacInfo() {

  // Need to get:
  // Look up for what version (Yosemite, Mavericks, Mountain Lion)
  // What version of Xcode
  var macVersion = 'El Capitan';
  switch (os.release().split('.')[0]) {
  case '16':
    macVersion = 'Sierra';
    break;
  case '15':
    macVersion = 'El Capitan';
    break;
  case '14':
    macVersion = 'Yosemite';
    break;
  case '13':
    macVersion = 'Mavericks';
    break;
  case '12':
    macVersion = 'Mountain Lion';
    break;
  case '11':
    macVersion = 'Lion';
    break;
  case '10':
    macVersion = 'Snow Leopard';
    break;
  }

  return 'Mac OS X ' + macVersion;
};

Info.getCordovaInfo = function getCordovaInfo(info) {
  var command = 'cordova -v';
  var result = shelljs.exec(command, { silent: true });
  if (result.code !== 0) {
    info.cordova = 'Not installed';
    return;
  }

  info.cordova = result.output.replace('\n', '');
};

Info.getXcodeInfo = function getXcodeInfo() {
  var result = shelljs.exec('/usr/bin/xcodebuild -version', { silent: true });
  if (result.code !== 0) {
    return 'Not installed';
  }
  var version = result.output.replace(/\n/g, ' ');
  return version;
};

Info.getIosSimInfo = function getIosSimInfo() {
  var result = shelljs.exec('ios-sim --version', { silent: true });
  if (result.code !== 0) {
    return 'Not installed';
  }
  var version = result.output.replace(/\n/g, ' ');
  return version;
};

Info.getIosDeployInfo = function getIosDeployInfo() {
  var result = shelljs.exec('ios-deploy --version', { silent: true });
  if (result.code !== 0) {
    return 'Not installed';
  }
  var version = result.output.replace(/\n/g, ' ');
  return version;
};

Info.getIonicCliVersion = function getIonicCliVersion(info, ionicCliPath) {
  try {
    var ionicCliPackageJsonPath = path.join(ionicCliPath, 'package.json');
    var ionicCliPackageJson = require(ionicCliPackageJsonPath);
    info.ionic_cli = ionicCliPackageJson.version; // eslint-disable-line camelcase
  } catch (ex) {} // eslint-disable-line no-empty
};

Info.getIonicAppScriptsVersion = function getIonicAppScriptsVersion(info, appDirectory) {
  log.info('--------------------------------');
  try {
    var packageJson = require(path.resolve(appDirectory, 'node_modules', '@ionic', 'app-scripts', 'package.json'));
    var ionicAppScriptsVersion = packageJson.version;

    info.ionic_app_scripts = ionicAppScriptsVersion; // eslint-disable-line camelcase
  } catch (ex) {} // eslint-disable-line no-empty
};

Info.getIonicLibVersion = function getIonicLibVersion(info) {
  try {
    var packageJson = require(path.resolve(__dirname, '../package.json'));
    var ionicLibVersion = packageJson.version;

    info.ionic_lib = ionicLibVersion; // eslint-disable-line camelcase
  } catch (ex) {} // eslint-disable-line no-empty
};

Info.getIonicVersion = function getIonicVersion(info, appDirectory) {
  var packageJson;
  try {
    packageJson = require(path.join(appDirectory, 'node_modules', 'ionic-angular', 'package.json'));
    info.ionic = packageJson.version;
    return;
  } catch (ex) {} // eslint-disable-line no-empty

  try {
    packageJson = require(path.join(appDirectory, 'node_modules', 'ionic-framework', 'package.json'));
    info.ionic = packageJson.version;
    return;
  } catch (ex) {} // eslint-disable-line no-empty

  try {
    var ionicVersionJson = require(path.join(appDirectory, 'www/lib/ionic/version.json'));
    info.ionic = ionicVersionJson.version;
    return;
  } catch (ex) {} // eslint-disable-line no-empty

  try {
    var ionicBowerJson = require(path.join(appDirectory, 'www', 'lib', 'ionic', 'bower.json'));
    info.ionic = ionicBowerJson.version;
  } catch (ex) {} // eslint-disable-line no-empty
};

// Windows XP  5.1.2600
// Windows Server 2003 5.2.3790
// Windows Vista
// Windows Server 2008 6.0.6000
// Windows Vista, SP2  6.0.6002
// Windows 7
// Windows Server 2008 R2  6.1.7600
// Windows 7 SP1
// Windows Server 2008 R2 SP1  6.1.7601
// Windows 8
// Windows Server 2012 6.2.9200
// Windows 8.1
// Windows Server 2012 R2  6.3.9600
// Windows 10 Technical Preview  6.4.9841

Info.getWindowsEnvironmentInfo = function getWindowsEnvironmentInfo() {

  // Windows version reference
  // http://en.wikipedia.org/wiki/Ver_%28command%29
  var version = os.release();
  var windowsVersion = null;
  switch (version) {
  case '5.1.2600':
    windowsVersion = 'Windows XP';
    break;
  case '6.0.6000':
    windowsVersion = 'Windows Vista';
    break;
  case '6.0.6002':
    windowsVersion = 'Windows Vista SP2';
    break;
  case '6.1.7600':
    windowsVersion = 'Windows 7';
    break;
  case '6.1.7601':
    windowsVersion = 'Windows 7 SP1';
    break;
  case '6.2.9200':
    windowsVersion = 'Windows 8';
    break;
  case '6.3.9600':
    windowsVersion = 'Windows 8.1';
    break;
  }

  return windowsVersion;
};

Info.getLinuxEnvironmentInfo = function getLinuxEnvironmentInfo() {
  var result = shelljs.exec('lsb_release -id', { silent: true });
  return result.output.replace(/\n/g, ' ');
};

// http://stackoverflow.com/questions/6551006/get-my-os-from-the-node-js-shell
Info.getOsEnvironment = function getOsEnvironment(info) {
  switch (os.type()) {
  case 'Darwin':
    info.os = Info.getMacInfo();
    info.xcode = Info.getXcodeInfo();
    info.ios_sim = Info.getIosSimInfo(); // eslint-disable-line camelcase
    info.ios_deploy = Info.getIosDeployInfo(); // eslint-disable-line camelcase
    break;
  case 'Windows_NT':
    info.os = Info.getWindowsEnvironmentInfo();
    break;
  case 'Linux':
    info.os = Info.getLinuxEnvironmentInfo();
    break;
  }
};

Info.getNodeVersion = function getNodeVersion(info) {
  info.node = process.version;
};

Info.gatherGulpInfo = function gatherGulpInfo(info) {
  var result = shelljs.exec('gulp -v', { silent: true });

  try {
    if (result.code === 0) {
      var gulpVersions = result.output.replace(/(\[.*\])/g, '').split('\n');
      if (gulpVersions.length > 0) {
        info.gulp = gulpVersions[0];
        info.gulp_local = gulpVersions[1]; // eslint-disable-line camelcase
      }
    }
  } catch (ex) {} // eslint-disable-line no-empty
};

Info.gatherInfo = function gatherInfo() {
  var info = {};

  // For macs we want:
  // Mac version, xcode version (if installed)

  // For windows
  // Windows version

  // For all
  // Android SDK info
  // Cordova CLI info
  // Ionic CLI version
  // Ionic version

  // var info = {
  //   cordova: 'CLI v3.5.0',
  //   os: 'Mac OSX Yosemite',
  //   xcode: 'Xcode 6.1.1',
  //   ionic: '1.0.0-beta.13',
  //   ionic_cli: '1.3.0'
  // };

  Info.getIonicLibVersion(info);

  Info.getIonicAppScriptsVersion(info);

  Info.getNodeVersion(info);

  Info.getOsEnvironment(info);

  Info.getCordovaInfo(info);

  Info.gatherGulpInfo(info);

  return info;
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

Info.checkRuntime = function checkRuntime() {
  var info = this.gatherInfo();
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

  // console.log('nodeUpgrade', nodeUpgrade, 'cordovaUpgrade', cordovaUpgrade, 'cordovaInstalled', cordovaInstalled);
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

    if (info.ios_sim === 'Not installed') {
      log.warn(' Install ios-sim to deploy iOS applications.' +
               '`npm install -g ios-sim` (may require sudo)');
    }
    if (info.ios_deploy === 'Not installed') {
      log.warn(' Install ios-deploy to deploy iOS applications to devices. ' +
               ' `npm install -g ios-deploy` (may require sudo)');
    }

    log.warn('');
    log.warn('******************************************************');
  }

  return validRuntime;
};

Info.run = function run() {

  var info = Info.gatherInfo();
  Info.printInfo(info);

  Info.checkRuntime();
};

