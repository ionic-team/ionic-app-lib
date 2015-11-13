var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    _ = require('lodash'),
    Utils = require('../utils'),
    Hooks = require('../hooks'),
    logging = require('../logging'),
    IonicProject = require('./project');

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

  var repoUrl, repoFolderName;
  if (options.template && /\/\/github.com\//i.test(options.template)) {
    repoUrl = options.template;
    var urlParse = parseUrl(repoUrl);
    var pathSplit = urlParse.pathname.replace(/\//g, ' ').trim().split(' ');
    if(!urlParse.hostname || urlParse.hostname.toLowerCase() !== 'github.com' || pathSplit.length !== 2) {
      logging.logger.error(('Invalid Github URL: ' + repoUrl).error );
      logging.logger.error(('Example of a valid URL: https://github.com/driftyco/ionic2-starter/').error );
      Utils.fail('');
      return;
    }
    repoFolderName = pathSplit[1] + '-master';

    // ensure there's an ending /
    if(repoUrl.substr(repoUrl.length -1) !== '/') {
      repoUrl += '/';
    }
    repoUrl += 'archive/master.zip';
  } else {
    repoUrl = ['https://github.com/driftyco/ionic2-starter-', options.template, '/archive/master.zip'].join('');
    repoFolderName = ['ionic2-starter-', options.template, '-master'].join('');
  }

  var errorWithStart = false;

  //Flag set to let fetch wrapper grab the ionic 2 app base.
  options.v2 = true;

  return Start.fetchWrapper(options)
  .then(function() {
    return Utils.fetchArchive(options.targetPath, repoUrl);
  })
  .then(function() {
    //Copy stuff and what not.
    // rm('-rf', options.targetPath + '/config.xml');
    // rm('-rf', options.targetPath + '/package.json');

    // don't use individual README for now
    // cp('-Rf', options.targetPath + '/' + repoFolderName + '/*', options.targetPath);
    rm('-rf', options.targetPath + '/www');
    cp('-Rf', options.targetPath + '/' + repoFolderName + '/www/.', options.targetPath + '/www');
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
  .then(function(){
    return Start.finalize(options);
  })
  .catch(function(err) {
    // logging.logger.error('Error Initializing app: %s'.red, err, {});
    // throw new Error('Unable to initalize app:')
    throw err;
  })
  .fin(function(){
    return 'Completed successfully';
  })
};

Start.finalize = function(options) {
  var projectPath = options.targetPath;
  try {
    var packageFilePath = path.join(projectPath, 'package.json');
    var packageData = require(packageFilePath);
    packageData.name = encodeURIComponent( options.appName.toLowerCase().replace(/\s+/g, '-') );
    packageData.description = options.appName + ': An Ionic project';
    fs.writeFileSync(packageFilePath, JSON.stringify(packageData, null, 2), 'utf8');
  } catch(e) {
    logging.logger.error('There was an error finalizing the package.json file. %s', e, {});
  }

  try {
    var configContents = fs.readFileSync(path.resolve(__dirname, 'templates/config.tpl.js'));
    var compile = _.template(configContents);
    var compiledConfigContents = compile({ 'appName': options.appName });
    fs.writeFileSync(path.resolve(projectPath, 'ionic.config.js'), compiledConfigContents);
  } catch(e) {
    console.error('Unable to initialize ionic.config.js:', e);
  }

  // if (options.ionicAppId) {
  //   project.set('app_id', options.ionicAppId);
  //   project.save();
  // }
  //
  // logging.logger.debug('Saved project file');
};
