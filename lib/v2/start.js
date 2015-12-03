var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    _ = require('lodash'),
    Utils = require('../utils'),
    Hooks = require('../hooks'),
    logging = require('../logging'),
    IonicProject = require('./project'),
    shelljs = require('shelljs/global');

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
  if (typeof options != 'object' || typeof options =='undefined') {
    throw new Error('You cannot start an app without options');
  }

  if (typeof options.projectPath == 'undefined') {
    throw new Error('projectPath cannot be undefined');
  }

  if (options.projectPath == '.') {
    throw new Error('You may not specify \'.\' as an app name');
  }

  var template = options.template || 'tabs';
  var starter = STARTERS[template];
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
    return Utils.fetchArchive(options.projectPath, repoUrl);
  })
  .then(function() {
    //Remove READMEs
    rm('-f', options.projectPath + '/' + repoFolderName + '/README.md');
    rm('-f', options.projectPath + '/' + 'README.md');

    //Copy contents of starter template into base, overwriting if already exists
    cp('-Rf', options.projectPath + '/' + repoFolderName + '/.', options.projectPath);
    rm('-rf', options.projectPath + '/' + repoFolderName + '/');
    cd(options.projectPath);
  })
  .then(function() {
    logging.logger.info('Installing Node Modules'.green);
    return Start.runExecCommand('npm install --production');
  })
  .then(function(){
    return Start.finalize(options);
  })
  .then(function(){
    //TODO new Response
  })
  .catch(function(err) {
    throw err;
  })
};

Start.finalize = function(options) {
  var projectPath = options.projectPath;
  try {
    var packageFilePath = path.join(projectPath, 'package.json');
    var packageData = require(packageFilePath);
    packageData.name = encodeURIComponent(options.projectDir.toLowerCase().replace(/\s+/g, '-'));
    packageData.description = options.appName + ': An Ionic project';
    fs.writeFileSync(packageFilePath, JSON.stringify(packageData, null, 2), 'utf8');
  } catch(e) {
    logging.logger.error('There was an error finalizing the package.json file. %s', e, {});
  }

  try {
    var configContents = fs.readFileSync(path.resolve(__dirname, 'templates/config.tpl.js'));
    var compile = _.template(configContents);
    var compiledConfigContents = compile({ 'appName': options.projectDir });
    fs.writeFileSync(path.resolve(projectPath, 'ionic.config.js'), compiledConfigContents);
  } catch(e) {
    console.error('Unable to initialize ionic.config.js:', e);
  }
};

Start.fetchWrapper = function fetchWrapper(options) {
  var repoName = 'ionic2-app-base';
  var repoUrl = 'https://github.com/driftyco/' + repoName + '/archive/master.zip';

  return Utils.fetchArchive(options.projectPath, repoUrl, options.isGui)
  .then(function() {
    var repoFolderName = repoName + '-master';
    cp('-R', options.projectPath + '/' + repoFolderName + '/.', options.projectPath);
    rm('-rf', options.projectPath + '/' + repoFolderName + '/');
    cd(options.targetPath);
  }).catch(function(err) {
    throw err;
  });
}

