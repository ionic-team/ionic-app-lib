var Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    exec = require('child_process').exec,
    Q = require('q'),
    IonicInfo = require('./info'),
    IonicProject = require('./project'),
    colors = require('colors'),
    Utils = require('./utils'),
    logging = require('./logging');

var Setup = module.exports;

Setup.modifyIndexFile = function modifyIndexFile(appDirectory) {
  var indexPath = path.join(appDirectory, path.join('www', Utils.getContentSrc(appDirectory)) );
  var lines, line, keepLine, activeRemoving;
  var cleanedLines = [];

  logging.logger.debug('Setup.modifyIndexFile for ' + appDirectory);

  try {
    lines = fs.readFileSync(indexPath, 'utf8').split('\n');
  } catch(e) {
    q.reject(e);
    return Utils.fail('Error loading ' + indexPath);
  }

  try {
    activeRemoving = false;

    for (var x = 0; x < lines.length; x++) {
      line = lines[x];
      keepLine = true;

      if ( /<!--(.*?) sass (.*?)/gi.test(line) ) {
        line = '    <!-- compiled css output -->';
        activeRemoving = true;
      } else if (activeRemoving && /(.*?)-->(.*?)/gi.test(line) ) {
        keepLine = false;
        activeRemoving = false;
      } else if ( /lib\/ionic\/css\/ionic.css|css\/style.css/gi.test(line) ) {
        keepLine = false;
      }

      if (keepLine) {
        cleanedLines.push(line);
      }
    }

    var project = null;

    try {
      project = IonicProject.load();
    } catch (ex) {
      Utils.fail(ex.message);
      return;
    }

    var gulpStartupTasks = project.get('gulpStartupTasks') || [];
    var hasSass, hasWatch;
    gulpStartupTasks.forEach(function(taskName){
      if(taskName == 'sass') hasSass = true;
      if(taskName == 'watch') hasWatch = true;
    });
    if(!hasSass) gulpStartupTasks.push('sass');
    if(!hasWatch) gulpStartupTasks.push('watch');
    project.set('gulpStartupTasks', gulpStartupTasks);
    if(!project.get('watchPatterns')){
      project.set('watchPatterns', ['www/**/*', '!www/lib/**/*'])
    }
    project.save();

    fs.writeFileSync(indexPath, cleanedLines.join('\n'), 'utf8');

    logging.logger.info('Updated '.green.bold + indexPath.bold + ' <link href>'.yellow.bold + ' references to sass compiled css'.green.bold);

    logging.logger.info('\nIonic project ready to use Sass!'.green.bold);
    logging.logger.info(' * Customize the app using'.yellow.bold, 'scss/ionic.app.scss'.bold);
    logging.logger.info(' * Run'.yellow.bold, 'ionic serve'.bold, 'to start a local dev server and watch/compile Sass to CSS'.yellow.bold);
    logging.logger.info('');

  } catch(e) {
    throw new Exception('Error parsing ' + indexPath + ': ' + e);
  }

  return Q();
};

Setup.sassSetup = function sassSetup(appDirectory) {
  var q = Q.defer();

  if (!Utils.gulpInstalledGlobally()) {
    var gulpMessage = ['You have specified Ionic CLI to set up sass.'.red, '\n', 'However, you do not have Gulp installed globally. Please run '.red, '`npm install -g gulp`'.green].join('');  
    logging.logger.info(gulpMessage);
    return Q(gulpMessage);
  }

  logging.logger.debug('Setup.sassSetup for ' + appDirectory);

  Setup.npmInstall(appDirectory)
  .then(function(){
    return Setup.modifyIndexFile(appDirectory);
  })
  .then(function(){
    return Setup.buildSass(appDirectory);
  })
  .then(q.resolve)
  .catch(function(ex) {
    q.reject(ex);
    return Utils.fail('Exception with ')
  });

  return q.promise;
};


Setup.buildSass = function buildSass(appDirectory) {
  logging.logger.debug('Setup.buildSass for ' + appDirectory);
  var q = Q.defer();

  var prevDir = process.cwd();
  process.chdir(appDirectory);
  var childProcess = exec('gulp sass');

  childProcess.stdout.on('data', function (data) {
    process.stdout.write(data);
  });

  childProcess.stderr.on('data', function (data) {
    if(data) {
      process.stderr.write(data.toString().yellow);
    }
  });

  childProcess.on('exit', function(code){
    process.chdir(prevDir);
    process.stderr.write('\n');
    if(code === 0) {
      logging.logger.info('Successful '.green.bold + 'sass build'.bold);
      q.resolve();
    } else {
      logging.logger.info('Error running '.error.bold + 'gulp sass'.bold);
      q.reject();
    }
  });

  return q.promise;
};


Setup.npmInstall = function npmInstall(appDirectory) {
  logging.logger.debug('Setup.npmInstall at ' + appDirectory);
  var q = Q.defer();
  var prevDir = process.cwd();
  process.chdir(appDirectory);
  var childProcess = exec('npm install');

  childProcess.stdout.on('data', function (data) {
    process.stdout.write(data);
  });

  childProcess.stderr.on('data', function (data) {
    if(data) {
      data = data.toString();
      if( !/no repository field/gi.test(data) ) {
        process.stderr.write(data.yellow);
      }
    }
  });

  childProcess.on('exit', function(code){
    process.chdir(prevDir);
    process.stderr.write('\n');
    if(code === 0) {
      logging.logger.info('Successful '.green.bold + 'npm install'.bold);
      q.resolve();
    } else {
      logging.logger.info('Error running '.error.bold + 'npm install'.bold);
      q.reject();
    }
  });

  return q.promise;
};

// Setup.setupFacebook = function setupFacebook(appDirectory) {
//   logging.logger.info('Setup Facebook has not yet been implemented.'.red);
//   return Q('Not completed');
// };

//Before any of this happens, check cordova CLI version. If they are prior to 4.3.0, they need
//to install platforms first. Alert user of this.
Setup.checkPreReqs = function checkPreReqs() {
  var infoTask = require('./info').IonicTask;
  var semver = require('semver');

  var envInfo = IonicInfo.gatherInfo();
  var platformsExist = false,
      platformStats,
      hasPreReqs = true;

  try {
    platformStats = fs.statSync(path.resolve('platforms'));
    platformsIosStats = fs.statSync(path.resolve('platforms', 'ios'));
    platformsAndroidStats = fs.statSync(path.resolve('platforms', 'android'));
    platformsExist = platformsIosStats.isDirectory() || platformsAndroidStats.isDirectory();
  } catch (ex) { } //default to false. It wont reach last line if ENOENT for ios/android

  try {

    if (!platformsExist && semver.satisfies(envInfo.cordova, '<=4.3.0')) {
      logging.logger.info('You are using a version of Cordova less than 4.3.0. There is a known issue if you add plugins before platforms are added.');
      logging.logger.info('We highly suggest you add your platforms before running this command.');
      hasPreReqs = false;
    }
  } catch (ex) {
    logging.logger.error('Error checking your Cordova CLI version: %s', ex, {});
  }

  return hasPreReqs;
}

Setup.setupFacebook = function setupFacebook(appDirectory) {
  var facebookAppUrl = 'https://developers.facebook.com/apps/';
  var installMessage = ['The Facebook plugin will be setup.\nYou will now be prompted for your App ID and Name.\nGet these settings from:', facebookAppUrl].join(' ');
  logging.logger.info(installMessage.blue.bold);
  //This wont work by downloading a release.
  //We will need to git clone it some how- 
  //http://stackoverflow.com/questions/24626729/facebooksdk-facebooksdk-h-file-not-found
  var downloadUrl = 'https://github.com/Wizcorp/phonegap-facebook-plugin/archive/master.zip';
  var zipOutPath = path.join(appDirectory, 'base');
  var facebookAppInfo = {};

  var promise;

  if (!Setup.checkPreReqs()) {
    logging.logger.error('prereq check fail')
    promise = Setup.promptForPlatformInstall();
  } else {
    promise = Q();
  }

  return promise
  .then(Setup.promptForFacebookInfo)
  .then(function(facebookInfo) {
    facebookAppInfo = facebookInfo;
    return Setup.downloadZipToDir(downloadUrl, zipOutPath, path.join(zipOutPath, 'phonegap-facebook-plugin-master'));
  })
  .then(function() {
    logging.logger.info('Installing Facebook Plugin'.info);
    return Setup.installFacebookPlugin(appDirectory, facebookAppInfo);
  })
  .then(function() {
    Setup.showMarkup();
  })
  .catch(function(ex) {
    logging.logger.info('Error occurred: %s', ex, {});
    logging.logger.info(ex.stack);
  });
};

Setup.installFacebookPlugin = function installFacebookPlugin(appDirectory, facebookInfo) {
  // var q = Q.defer();
  var basePath = path.join(appDirectory, 'base', 'phonegap-facebook-plugin-master');
  var command = ['ionic plugin add ', basePath, ' --variable APP_ID="', facebookInfo.app_id, '" --variable APP_NAME="', facebookInfo.app_name, '"'].join('');
  var result = shelljs.exec(command);
  logging.logger.info('Running: ', command);

  if (result.code != 0) {
    var errorMessage = ['There was an error adding the Cordova Facebook Plugin', result.output].join('\n');
    Utils.fail(errorMessage);
    throw new Error(errorMessage);
  } else {
    logging.logger.info('\nAdded Cordova Facebook Plugin')
  }
  // return q.promise;
};

Setup.showMarkup = function showMarkup() {
  var facebookSnippetPath = path.join(__dirname, 'assets', 'facebookSnippets.js');
  var facebookSnippet = fs.readFileSync(facebookSnippetPath, 'utf8');
  logging.logger.info('Put this JS in your Controller to use the Facebook plugin:'.green);
  logging.logger.info(facebookSnippet.blue);
  logging.logger.info('Use this HTML to trigger the above login method'.green);
  logging.logger.info('<button ng-click="login()">Login to Facebook!</button>'.blue)
};

Setup.promptForPlatformInstall = function promptForPlatformInstall() {
  var schema = [{
    name: 'platform',
    // pattern: /^[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+(?:\.[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+)*@(?:[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?$/,
    description: 'Install platforms? (ios|android|both): '.yellow.bold,
    required: true
  }];

  return Setup.promptUserPromise(schema)
  .then(function(result) {
    var platform = result.platform.toLowerCase().trim();
    switch (platform) {
      case 'ios':
        shelljs.exec('ionic platform add ios');
        break;
      case 'android':
        shelljs.exec('ionic platform add android');
        break;
      case 'both':
        shelljs.exec('ionic platform add ios');
        shelljs.exec('ionic platform add android');
        break;
    }
  });
};

Setup.promptForFacebookInfo = function promptForFacebookInfo() {
  var schema = [{
    name: 'app_id',
    // pattern: /^[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+(?:\.[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+)*@(?:[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?$/,
    description: 'Facebook App ID:'.yellow.bold,
    required: true
  }, {
    name: 'app_name',
    description: 'App Name:'.yellow.bold,
    required: true
  }];

  return Setup.promptUserPromise(schema)
  .then(function(result) {
    var fbInfo = {
      app_id: result.app_id,
      app_name: result.app_name
    }
    return fbInfo;
  });
};

Setup.promptUserPromise = function promptUserPromise(schema) {
  var q = Q.defer();
  var prompt = require('prompt');

  prompt.override = argv;
  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  prompt.get(schema, function (err, result) {
    if (err) {
      q.reject(err);
      return Utils.fail('Error getting Facebook app information: ' + err);
    }

    q.resolve(result);
  });

  return q.promise;
};

Setup.downloadZipToDir = function downloadZipToDir(downloadUrl, zipOutPath, outputDir) {
  logging.logger.info('Attemping to download the Facebook plugin'.info);
  var q = Q.defer();

  if (!fs.existsSync(zipOutPath)) {
    shelljs.mkdir(zipOutPath);
  }

  if (fs.existsSync(outputDir)) {
    logging.logger.info('The Facebook plugin has already been downloaded. Skipping this step.'.green);
    return q.resolve();
  }

  Utils.fetchArchive(zipOutPath, downloadUrl)
  .then(function(data) {
    logging.logger.info('The Facebook plugin has finished downloading.'.green);
    q.resolve();
  }, function(error) {
    logging.logger.info('Failed to download Facebook plugin - ', error);
    q.reject();
  })

  return q.promise;
};
