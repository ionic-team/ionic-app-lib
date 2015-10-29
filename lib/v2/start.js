var Utils = require('../utils'),
    Hooks = require('../hooks'),
    logging = require('../logging');

// Only want to override functions that have a v2 specific implementation
var Start = Object.create(require('../start'));
module.exports = Start;

Start.startApp = function start(options) {
  if(typeof options != 'object' || typeof options =='undefined') {
    throw new Error('You cannot start an app without options');
  }

  if(typeof options.targetPath == 'undefined' || options.targetPath == '.') {
    throw new Error('Invalid target path, you may not specify \'.\' as an app name');
  }

  var repoDownloadName = 'ionic2-starter';
  if(options.template) {
    repoDownloadName = ['ionic2-starter', options.template].join('-');
  }

  var repoFolderName = repoDownloadName + '-master';
  var repoUrl = 'https://github.com/driftyco/' + repoDownloadName + '/archive/master.zip';

  return Utils.fetchArchive(options.targetPath, repoUrl)
  .then(function() {
    //Copy stuff and what not.
    rm('-rf', options.targetPath + '/config.xml');
    rm('-rf', options.targetPath + '/package.json');
    cp('-R', options.targetPath + '/' + repoFolderName + '/*', options.targetPath);
    rm('-rf', options.targetPath + '/www');
    cp('-R', options.targetPath + '/' + repoFolderName + '/www/.', options.targetPath + '/www');
    rm('-rf', options.targetPath + '/' + repoFolderName + '/');
    cd(options.targetPath);

    if(!options.isCordovaProject) {
      // remove any cordova files/directories if they only want the www
      var cordovaFiles = ['hooks/', 'platforms/', 'plugins/', 'config.xml'];
      for(var x=0; x<cordovaFiles.length; x++) {
        rm('-rf', options.targetPath + '/' + cordovaFiles[x]);
      }
    }
  })
  .then(function() {
    logging.logger.info('Installing Node Modules'.green);
    return Start.runExecCommand('npm install');
    // return true;
  })
  .then(function() {
    // logging.logger.debug('Setting up hooks permissions'.green);
    return Hooks.setHooksPermission(options.targetPath);
  })
  .then(function(){
    return Start.loadAppSetup(options);
  })
  .then(function(appSetup){
    if (options.isCordovaProject && !options.isGui) {
      return Start.initCordova(options, appSetup);
    } else if (options.isCordovaProject && options.isGui) {
      return Start.initCordovaFromGui(options, appSetup);
    }
  })
  .then(function() {
    if (options.isCordovaProject) {
      return Start.addDefaultPlatforms(options);
    }
  });
};
