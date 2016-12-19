var chalk = require('chalk');
var fs = require('fs');
var archiver = require('archiver');
var ConfigXml = require('./config-xml');
var Multibar = require('./multibar');
var path = require('path');
var Q = require('q');
var shelljs = require('shelljs');
var log = require('./logging').logger;

var Utils = module.exports;

Utils.errorHandler = null;

Utils.transformCookies = function transformCookies(jar) {
  if (!jar) {
    throw new Error('You parse out cookies if they are null');
  }
  return jar.map(function(c) {
    return c.key + '=' + encodeURIComponent(c.value);
  }).join('; ');
};

Utils.retrieveCsrfToken = function retrieveCsrfToken(jar) {
  var csrftoken = '';

  if (!jar || typeof jar == 'undefined' || jar.length === 0) {
    return '';
  }

  for (var i = 0; i < jar.length; i += 1) {
    if (jar[i].key === 'csrftoken') {
      csrftoken = jar[i].value;
      break;
    }
  }
  return csrftoken;
};

/**
 * Utils.getProxy will return a string that represents a HTTP proxy server
 * setup by the user in their environment variables.
 *
 * No parameters are required
 * @return {String} or null if no proxy has been setup
 */
Utils.getProxy = function() {
  return process.env.PROXY || process.env.HTTP_PROXY || process.env.http_proxy || process.env.proxy || null;
};

/**
 * Utils.createArchive will zip up a subdirectory in the app directory
 *
 * Utils.createArchive(appDirectory, 'www') makes a zip file at
 * {appDirectory}/www.zip whose file structure is like www.zip/www/{assets}
 *
 * @param {string} appDirectory The app's absolute directory
 * @param {string} documentRoot Denotation of the subdirectory, e.g. 'www'
 *
 * @return {Promise}
 */
Utils.createArchive = function(appDirectory, documentRoot) {
  var q = Q.defer();
  var zipPath = path.join(appDirectory, documentRoot);

  log.debug('Now zipping contents of ' + zipPath);

  if (!fs.existsSync(zipPath)) {
    q.reject(documentRoot + ' directory cannot be found. Make sure the working directory ' +
             'is at the top level of an Ionic project.', 'upload');
  }

  var zipDestination = zipPath + '.zip';
  var zip = fs.createWriteStream(zipDestination);

  var archive = archiver('zip');
  archive.pipe(zip);

  archive.bulk([
    { expand: true, cwd: zipPath, src: ['**'] }
  ]);

  archive.finalize(function(err) {
    if (err) {
      q.reject(['Error uploading: ', err].join(''));
    }
  });

  zip.on('close', function() {
    q.resolve(zipDestination);
  });

  return q.promise;
};

Utils.fetchArchive = function fetchArchive(targetPath, archiveUrl, isGui) {
  var os = require('os');
  var fs = require('fs');
  var path = require('path');
  var AdmZip = require('adm-zip');
  var q = Q.defer();

  // The folder name the project will be downloaded and extracted to
  var message = ['Downloading:'.bold, archiveUrl].join(' ');
  log.info(message);

  var tmpFolder = os.tmpdir();
  var tempZipFilePath = path.join(tmpFolder, 'ionic-starter-' + new Date().getTime() + '.zip');

  var proxy = Utils.getProxy();
  var request = require('request');
  request({ url: archiveUrl, rejectUnauthorized: false, encoding: null, proxy: proxy }, function(err, res, body) {
    if (err) {
      return q.reject(err);
    }
    if (!res) {
      log.error(chalk.red.bold('Invalid response:'), archiveUrl);
      return q.reject('Unable to fetch response: ' + archiveUrl);
    }
    if (parseInt(res.statusCode, 10) !== 200) {
      if (parseInt(res.statusCode, 10) === 404 || parseInt(res.statusCode, 10) === 406) {
        log.error(chalk.red.bold('Not found:'), archiveUrl, '(' + res.statusCode + ')');
        log.error(chalk.red.bold('Please verify the url and try again.'));
      } else {
        log.error(chalk.red.bold('Invalid response status:'), archiveUrl, '(' + res.statusCode + ')');
      }
      q.reject(res);
      return;
    }
    try {
      fs.writeFileSync(tempZipFilePath, body);
      var zip = new AdmZip(tempZipFilePath);
      zip.extractAllTo(targetPath);
      q.resolve();
    } catch (e) {
      log.debug('fetchArchive request write: ', e);
      q.reject(e);
    }
  }).on('response', function(res) {
  });

  return q.promise;
};

Utils.preprocessOptions = function preprocessOptions(options) {
  var result = {};

  result.appDirectory = options.appDirectory;
  result.targetPath = options.targetPath || null;
  result.template = options.template || 'blank';
  result.packageName = options.packageName || null;

  if (!options.appName) {
    var appNameSplit = options.appDirectory.split('/');
    appNameSplit = appNameSplit[appNameSplit.length - 1].split('\\');
    options.appName = appNameSplit[appNameSplit.length - 1];
  } else {
    result.appName = options.appName;
  }

  result.isCordovaProject = options.isCordovaProject || true;
  result.setupSass = options.setupSass || true;

  return result;
};

Utils.preprocessCliOptions = function preprocessCliOptions(argv) {
  log.debug('Utils.preprocessCliOptions', argv);
  try {
    var options = {};

    //      0     1
    // ionic start facebooker
    // Grab the app's relative directory name
    options.appDirectory = argv._[1];

    // Grab the name of the app from -a or  --app. Defaults to appDirectory if none provided
    options.appName = argv.appname || argv['app-name'] || argv.a;
    if (!options.appName) {
      var appNameSplit = options.appDirectory.split('/');
      appNameSplit = appNameSplit[appNameSplit.length - 1].split('\\');
      options.appName = appNameSplit[appNameSplit.length - 1];
    }

    // get a packge name, like com.ionic.myapp
    options.packageName = argv.id || argv.i;
    options.ionicAppId = argv['io-app-id'];
    options.isCordovaProject = (argv.cordova !== false && !(argv.w || argv['no-cordova']));

    // start project template can come from cmd line args -t, --template, or the 3rd arg, and defaults to tabs
    options.template = (argv.template || argv.t || argv._[2] || 'tabs');

    // figure out the full path
    options.targetPath = Utils.getProjectDirectory(options);

    options.typescript = argv.typescript || argv.ts;
    options.v2 = argv.v2 || argv.v;
    options.skipNpm = argv['skip-npm'];

    // internal commands for changing which branches the starter should use
    options.wrapperBranchName = argv.wrapperBranchName;
    options.starterBranchName = argv.starterBranchName;

    return options;
  } catch (ex) {
    log.debug('An error occrured processing the CLI arguments', ex);
    Utils.fail('There was an error parsing out options from the Command Line');
  }
};

Utils.getProjectDirectory = function getProjectDirectory(options) {
  return path.resolve(options.appDirectory);
};

Utils.getContentSrc = function getContentSrc(appDirectory) {
  log.debug('Utils.getContentSrc', appDirectory);
  var contentSrc;
  try {
    var fs = require('fs');
    var path = require('path');
    var configXmlPath = path.join(appDirectory, 'config.xml');
    if (!fs.existsSync(configXmlPath)) {
      return 'index.html';
    }

    ConfigXml.setConfigXml(appDirectory, {
      resetContent: true,
      errorWhenNotFound: false
    });

    var configString = fs.readFileSync(configXmlPath, { encoding: 'utf8' });

    var xml2js = require('xml2js');
    var parseString = xml2js.parseString;
    parseString(configString, function(err, jsonConfig) {
      if (err) {
        return Utils.fail('Error parsing config.xml: ' + err);
      }
      try {
        contentSrc = jsonConfig.widget.content[0].$.src;
      } catch (e) {
        return Utils.fail('Error parsing ' + configXmlPath + ': ' + e.stack);
      }
    });

  } catch (e) {
    return Utils.fail('Error loading ' + configXmlPath + ': ' + e.stack);
  }

  return contentSrc;
};

Utils.mergeOptions = function mergeOptions(obj1, obj2) {
  var obj3 = {};
  for (var attrname in obj1) {
    if (obj1.hasOwnProperty(attrname)) {
      obj3[attrname] = obj1[attrname];
    }
  }
  for (var attr in obj2) {
    if (obj2.hasOwnProperty(attr)) {
      obj3[attr] = obj2[attr];
    }
  }
  return obj3;
};

Utils.fail = function fail(msg, taskHelp) {
  try {
    log.debug('Utils.fail', msg, taskHelp);
    log.debug('Utils.fail stack', msg.stack);

    // If an error handler is set, use it. Otherwise, just print basic info.
    if (Utils.errorHandler) {
      log.debug('Utils.errorHandler is set, calling that now');
      return Utils.errorHandler(msg, taskHelp);
    }

    log.error('An error occurred in Ionic App Lib and no error handler was set.');
    log.error(msg);
    process.exit(1);
    return '';
  } catch (ex) {
    log.debug('Utils.fail: ', ex);
  }
};

Utils.gulpInstalledGlobally = function gulpInstalledGlobally() {
  var result = shelljs.exec('gulp -v', { silent: true });

  if (result.code !== 0) {
    return false;
  }
  return true;
};

Utils.cordovaInstalled = function cordovaInstalled() {
  var Info = require('./info');

  return Info.gatherInfo().then(function(info) {
    return info.cordova !== 'Not installed';
  });
};

Utils.findIonicRoot = function findIonicRoot(dir) {
  var IonicProject = require('./project');

  if (!dir) {
    var pwd = process.env.PWD;
    var cwd = process.cwd();
    if (pwd && pwd !== cwd && pwd !== 'undefined') {
      return Utils.findIonicRoot(pwd) || Utils.findIonicRoot(cwd);
    }
    return Utils.findIonicRoot(cwd);
  }
  for (var i = 0; i < 1000; i += 1) {
    if (fs.existsSync(path.join(dir, IonicProject.PROJECT_FILE))) {
      return dir;
    }

    // TODO: deprecated
    if (fs.existsSync(path.join(dir, IonicProject.OLD_PROJECT_FILE))) {
      return dir;
    }

    // TODO: deprecated
    if (fs.existsSync(path.join(dir, 'ionic.config.js'))) {
      return dir;
    }

    var parentDir = path.normalize(path.join(dir, '..'));

    // Detect fs root.
    if (parentDir === dir) {
      return null;
    }
    dir = parentDir;
  }
  log.error('Hit an unhandled case in utils.findIonicRoot');
  return null;
};

Utils.cdIonicRoot = function cdIonicRoot() {
  var IonicProject = require('./project');

  log.debug('Looking up Ionic root, cwd:', process.cwd());
  var rootDir = this.findIonicRoot();
  if (!rootDir) {
    log.error('Couldn\'t find ' + IonicProject.PROJECT_FILE + ' file. Are you in an Ionic project?');
    process.exit(1);
  }
  log.debug('Ionic root directory: ', process.cwd());
  process.env.PWD = rootDir;
  process.chdir(rootDir);

  return rootDir;
};

Utils.promisify = function promisify(func) {
  return function() {
    var deferred = Q.defer();
    var args = Array.prototype.slice.call(arguments);

    func.apply(null, args.concat(function(err, response) {
      if (err) {
        return deferred.reject(err);
      }
      deferred.resolve(response);
    }));

    return deferred.promise;
  };
};
