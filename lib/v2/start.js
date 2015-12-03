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

var BRANCH_NAME = "master";

var STARTERS = {
  "blank": {
    "repoName": "ionic2-starter-blank",
    "url": "https://github.com/driftyco/ionic2-starter-blank/archive/" + BRANCH_NAME + ".zip",
  },
  "tabs": {
    "repoName": "ionic2-starter-tabs",
    "url": "https://github.com/driftyco/ionic2-starter-tabs/archive/" + BRANCH_NAME + ".zip",
  },
  "sidemenu": {
    "repoName": "ionic2-starter-sidemenu",
    "url": "https://github.com/driftyco/ionic2-starter-sidemenu/archive/" + BRANCH_NAME + ".zip",
  },
  "conference": {
    "repoName": "ionic-conference-app",
    "url": "https://github.com/driftyco/ionic-conference-app/archive/" + BRANCH_NAME + ".zip",
  },
  "tutorial": {
    "repoName": "ionic2-starter-tutorial",
    "url": "https://github.com/driftyco/ionic2-starter-tutorial/archive/" + BRANCH_NAME + ".zip",
  }
}

Start.startApp = function start(options) {
  if(typeof options != 'object' || typeof options =='undefined') {
    throw new Error('You cannot start an app without options');
  }

  if(typeof options.targetPath == 'undefined' || options.targetPath == '.') {
    throw new Error('Invalid target path, you may not specify \'.\' as an app name');
  }

  //TODO: right now, default options.template is  always set in Util.preprocessOptions,
  // after v2 task refactor add default to be 'tabs' here.
  var starter = STARTERS[options.template];
  if (!starter) {
    throw new Error('No starter template named "' + options.template + '"');
  }
  var repoUrl = starter.url;
  var repoFolderName = starter.repoName + '-' + BRANCH_NAME;

  var errorWithStart = false;

  //Flag set to let fetch wrapper grab the ionic 2 app base.
  options.v2 = true;

  return Start.fetchWrapper(options)
  .then(function() {
    return Utils.fetchArchive(options.targetPath, repoUrl);
  })
  .then(function() {
    //Remove READMEs
    rm('-f', options.targetPath + '/' + repoFolderName + '/README.md');
    rm('-f', options.targetPath + '/' + 'README.md');

    //Copy contents of starter template into base, overwriting if already exists
    cp('-Rf', options.targetPath + '/' + repoFolderName + '/.', options.targetPath);
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
