var fs = require('fs'),
    path = require('path'),
    shelljs = require('shelljs'),
    os = require('os'),
    argv = require('optimist').argv,
    IonicProject = require('./project'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    semver = require('semver'),
    events = require('./events');

var Info = module.exports;

var requirements = {
  node: '>=0.12.x',
  cordova: '>=4.2.0'
}

Info.getMacInfo = function getMacInfo() {
  //Need to get:
  //Look up for what version (Yosemite, Mavericks, Mountain Lion)
  //What version of Xcode
  var macVersion = 'Yosemite';
  switch(os.release()) {
    case '14.0.0':
      macVersion = 'Yosemite';
      break;
    case '13.0.0':
    case '13.1.0':
    case '13.2.0':
    case '13.3.0':
    case '13.4.0':
      macVersion = 'Mavericks';
      break;
    case '12.0.0':
    case '12.5.0':
      macVersion = 'Mountain Lion';
      break;
    case '11.4.2':
      macVersion = 'Lion';
      break;
    case '10.8':
      macVersion = 'Snow Leopard';
      break;
  }

  return 'Mac OS X ' + macVersion;
  // events.emit('log', 'Mac OS X', macVersion);
};

Info.getCordovaInfo = function getCordovaInfo(info) {
  var command = 'cordova -v';
  var result = shelljs.exec(command, { silent: true });
  if(result.code != 0) {
    info.cordova = 'Not installed';
    return;
  }

  info.cordova = result.output.replace('\n', '');
};

Info.getXcodeInfo = function getXcodeInfo() {
  var result = shelljs.exec('/usr/bin/xcodebuild -version', { silent: true });
  if(result.code != 0) {
    return 'Not installed';
  }
  var version = result.output.replace(/\n/g, ' ')
  return version;
};

Info.getIosSimInfo = function getIosSimInfo() {
  var result = shelljs.exec('ios-sim --version', { silent: true });
  if(result.code != 0) {
    return 'Not installed';
  }
  var version = result.output.replace(/\n/g, ' ')
  return version;
};

Info.getIosDeployInfo = function getIosDeployInfo() {
  var result = shelljs.exec('ios-deploy --version', { silent: true });
  if(result.code != 0) {
    return 'Not installed';
  }
  var version = result.output.replace(/\n/g, ' ')
  return version;
};

Info.getIonicCliVersion = function getIonicCliVersion(info, ionicCliPath) {
  try {
    var ionicCliPackageJsonPath = path.join(ionicCliPath, 'package.json');
    var ionicCliPackageJson = require(ionicCliPackageJsonPath);
    info.ionic_cli = ionicCliPackageJson.version;
  } catch (ex) { }
};

Info.getIonicLibVersion = function getIonicLibVersion(info) {
  try {
    var packageJson = require(path.resolve(__dirname, '../package.json'));
    var ionicLibVersion = packageJson.version;

    info.ionic_lib = ionicLibVersion;
  } catch (ex) { }
};

Info.getIonicVersion = function getIonicVersion(info, appDirectory) {
  try {
    var ionicVersionFile = require(path.join(appDirectory, 'www/lib/ionic/version.json'));
    var ionicVersion = ionicVersionFile.version;
    info.ionic = ionicVersion;
  } catch (ex) { }

  try {
    var bowerJsonPath = path.join(appDirectory, 'www', 'lib', 'ionic', 'bower.json');
    var ionicPackageJson = require(bowerJsonPath);
    var ionicVersion = ionicPackageJson.version;
    info.ionic = ionicVersion;
  } catch (ex) { }

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
  switch(version) {
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
  return result.output.replace(/\n/g, ' ')
};

//http://stackoverflow.com/questions/6551006/get-my-os-from-the-node-js-shell
Info.getOsEnvironment = function getOsEnvironment(info) {
  switch(os.type()) {
    case 'Darwin':
      info.os = Info.getMacInfo();
      info.xcode = Info.getXcodeInfo();
      info.ios_sim = Info.getIosSimInfo();
      info.ios_deploy = Info.getIosDeployInfo();
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
  // var command = 'node -v';
  // var result = shelljs.exec(command, { silent: true } );
  // info.node = result.output.replace('\n','');
};

Info.gatherGulpInfo = function gatherGulpInfo(info) {
  var result = shelljs.exec('gulp -v', { silent: true });

  try {
    if (result.code == 0) {
      // console.log(result.output);
      var gulpVersions = result.output.replace(/(\[.*\])/g, '').split('\n');
      if (gulpVersions.length > 0) {
        info.gulp = gulpVersions[0];
        info.gulp_local = gulpVersions[1];
      }
    }
  } catch (ex) {

  }
};

Info.gatherInfo = function gatherInfo() {
  var info = {};
  //For macs we want:
  //Mac version, xcode version (if installed)

  //For windows
  //Windows version

  //For all
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

  Info.getNodeVersion(info);

  Info.getOsEnvironment(info);

  Info.getCordovaInfo(info);

  Info.gatherGulpInfo(info);

  return info;
};

Info.printInfo = function printInfo(info) {
  events.emit('log', '\nYour system information:\n');

  events.emit('log', 'Cordova CLI:', info.cordova);
  if (info.gulp) {
    events.emit('log', 'Gulp version:', info.gulp);
    events.emit('log', 'Gulp local: ', info.gulp_local);
  }

  if (info.ionic) {
    events.emit('log', 'Ionic Version:', info.ionic);
  }

  if (info.ionic_cli) {
    events.emit('log', 'Ionic CLI Version:', info.ionic_cli);
  }

  if (info.ionic_lib) {
    events.emit('log', 'Ionic App Lib Version:', info.ionic_lib);
  }

  if (info.ios_deploy) {
    events.emit('log', 'ios-deploy version:', info.ios_deploy)
  }

  if(info.ios_sim) {
    events.emit('log', 'ios-sim version:', info.ios_sim);
  }

  events.emit('log', 'OS:', info.os);
  events.emit('log', 'Node Version:', info.node);

  if(info.xcode) {
    events.emit('log', 'Xcode version:', info.xcode);
  }

  events.emit('log', '\n');
};

Info.checkRuntime = function checkRuntime() {
  var info = this.gatherInfo();
  var validRuntime = true;

  var nodeUpgrade = !semver.satisfies(info.node, requirements.node);
  var cordovaUpgrade = !semver.satisfies(info.cordova, requirements.cordova);

  if (nodeUpgrade || cordovaUpgrade ) {
    events.emit('log', '******************************************************'.red.bold);
    events.emit('log', ' Upgrade warning - for the CLI to run correctly,      '.red.bold);
    events.emit('log', ' it is highly suggested to upgrade the following:     '.red.bold);
    events.emit('log', '');

    if(nodeUpgrade) {
      var updateMessage = [' Please update your Node runtime to version ', requirements.node].join(' ');
      events.emit('log', updateMessage.red.bold);
      validRuntime = false;
    }

    if(cordovaUpgrade) {
      var updateMessage = [' Please update your Cordova CLI to version ', requirements.cordova, '`npm install -g cordova`'].join(' ')
      events.emit('log', updateMessage.red.bold);
      validRuntime = false;
    }
    events.emit('log', '');
    events.emit('log', '******************************************************'.red.bold);
  }

  return validRuntime;
};

Info.run = function run(ionic) {

  var info = Info.gatherInfo();
  Info.printInfo(info);

  Info.checkRuntime();

  IonicStats.t();
};
