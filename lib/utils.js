var colors = require('colors'),
    ConfigXml = require('./config-xml'),
    events = require('./events'),
    Multibar = require('./multibar'),
    Opbeat = require('./opbeat'),
    path = require('path'),
    Q = require('q'),
    shelljs = require('shelljs');

var Utils = module.exports;

Utils.errorHandler = null;

Utils.transformCookies = function transformCookies(jar) {
  if(!jar) {
    throw new Error('You parse out cookies if they are null')
  }
  return jar.map(function(c) {
    return c.key + "=" + encodeURIComponent(c.value);
  }).join("; ");
}

Utils.retrieveCsrfToken = function retrieveCsrfToken(jar) {
  if(!jar || typeof jar == 'undefined' || jar.length == 0) {
    return '';
  }
  var csrftoken = '';
  for (var i = 0; i < jar.length; i++) {
    if (jar[i].key == 'csrftoken') {
      csrftoken = jar[i].value;
      break;
    }
  }
  return csrftoken;
}

Utils.fetchArchive = function fetchArchive(targetPath, archiveUrl) {
  var os = require('os');
  var fs = require('fs');
  var path = require('path');
  var unzip = require('unzip');
  var q = Q.defer();

  // The folder name the project will be downloaded and extracted to
  var message = ['Downloading:'.bold, archiveUrl].join(' ');
  events.emit('log', message);

  var tmpFolder = os.tmpdir();
  var tempZipFilePath = path.join(tmpFolder, 'ionic-starter-' + new Date().getTime() + '.zip');


  var unzipRepo = function unzipRepo(fileName) {
    var readStream = fs.createReadStream(fileName);
    readStream.on('error', function(err) {
      events.emit('verbose', ('unzipRepo readStream: ' + err).error );
      q.reject(err);
    });

    var writeStream = unzip.Extract({ path: targetPath });
    writeStream.on('close', function() {
      q.resolve();
    });
    writeStream.on('error', function(err) {
      events.emit('verbose', ('unzipRepo writeStream: ' + err).error );
      q.reject(err);
    });
    readStream.pipe(writeStream);
  };

  var proxy = process.env.PROXY || process.env.http_proxy || null;
  var request = require('request');
  request({ url: archiveUrl, rejectUnauthorized: false, encoding: null, proxy: proxy }, function(err, res, body) {
    if(err) {
      // console.error('Error fetching:'.error.bold, archiveUrl, err);
      q.reject(err);
      return;
    }
    if(!res) {
      console.error('Invalid response:'.error.bold, archiveUrl);
      q.reject('Unable to fetch response: ' + archiveUrl);
      return;
    }
    if(res.statusCode !== 200) {
      if(res.statusCode === 404 || res.statusCode === 406) {
        console.error('Not found:'.error.bold, archiveUrl, '(' + res.statusCode + ')');
        console.error('Please verify the url and try again.'.error.bold);
      } else {
        console.error('Invalid response status:'.error.bold, archiveUrl, '(' + res.statusCode + ')');
      }
      q.reject(res);
      return;
    }
    try {
      fs.writeFileSync(tempZipFilePath, body);
      unzipRepo(tempZipFilePath);
    } catch(e) {
      events.emit('verbose', 'fetchArchive request write: ' + e);
      q.reject(e);
    }
  }).on('response', function(res){
    // var ProgressBar = require('progress');
    var bar = Multibar.newBar('[:bar]  :percent  :etas', {
      complete: '=',
      incomplete: ' ',
      width: 30,
      total: parseInt(res.headers['content-length'], 10)
    });

    res.on('data', function (chunk) {
      try {
        bar.tick(chunk.length);
      } catch(e){}
    });
  });

  return q.promise;
}

Utils.preprocessOptions = function preprocessOptions(options) {
  var result = {};

  result.appDirectory = options.appDirectory;
  result.targetPath = options.targetPath || null;
  result.template = options.template || 'blank';
  result.packageName = options.packageName || null;
  // result.appName = options.appName || '';

  if (!options.appName) {
    var appNameSplit = options.appDirectory.split('/');
    appNameSplit = appNameSplit[ appNameSplit.length -1 ].split('\\');
    options.appName = appNameSplit[ appNameSplit.length -1 ];
  } else {
    result.appName = options.appName;
  }

  result.isCordovaProject = options.isCordovaProject || true;
  result.setupSass = options.setupSass || true;

  return result;
};

Utils.preprocessCliOptions = function preprocessCliOptions(argv) {
  events.emit('verbose', 'Utils.preprocessCliOptions', argv);
  try {
    var options = {};

    //      0     1
    //ionic start facebooker
    // Grab the app's relative directory name
    options.appDirectory = argv._[1];

    // Grab the name of the app from -a or  --app. Defaults to appDirectory if none provided
    options.appName = argv.appname || argv['app-name'] || argv.a;
    if(!options.appName) {
      var appNameSplit = options.appDirectory.split('/');
      appNameSplit = appNameSplit[ appNameSplit.length -1 ].split('\\');
      options.appName = appNameSplit[ appNameSplit.length -1 ];
    }

    // get a packge name, like com.ionic.myapp
    options.packageName = argv.id || argv.i;
    options.ionicAppId = argv['io-app-id'];
    options.isCordovaProject = (argv.cordova !== false && !(argv.w || argv['no-cordova']));
    // options.isCordovaProject = (argv.cordova !== false && !argv.w);

    // start project template can come from cmd line args -t, --template, or the 3rd arg, and defaults to tabs
    options.template = (argv.template || argv.t || argv._[2] || 'tabs');

    // figure out the full path
    options.targetPath = Utils.getProjectDirectory(options);

    return options;
  } catch (ex) {
    events.emit('verbose', 'An error occrured processing the CLI arguments', ex, ex.stack);
    Utils.fail('There was an error parsing out options from the Command Line');
  }
};

Utils.getProjectDirectory = function getProjectDirectory(options) {
  return path.resolve(options.appDirectory);
};

Utils.getContentSrc = function getContentSrc(appDirectory) {
  events.emit('verbose', 'Utils.getContentSrc', appDirectory);
  var contentSrc;
  try {
    var fs = require('fs');
    var path = require('path');
    var configXmlPath = path.join(appDirectory, 'config.xml');
    if( !fs.existsSync(configXmlPath) ) {
      return 'index.html';
    }

    ConfigXml.setConfigXml(appDirectory, {
      resetContent: true,
      errorWhenNotFound: false
    });

    var configString = fs.readFileSync(configXmlPath, { encoding: 'utf8' });

    var xml2js = require('xml2js');
    var parseString = xml2js.parseString;
    parseString(configString, function (err, jsonConfig) {
      if(err) {
        return Utils.fail('Error parsing config.xml: ' + err);
      }
      try {
        contentSrc = jsonConfig.widget.content[0].$.src;
      } catch(e) {
        return Utils.fail('Error parsing ' + configXmlPath + ': ' + e);
      }
    });

  } catch(e) {
    events.emit('verbose', 'Utils.getContentSrc failed', e.stack);
    console.log(e.stack);
    return Utils.fail('Error loading ' + configXmlPath + ': ' + e);
  }

  return contentSrc;
};

Utils.mergeOptions = function mergeOptions(obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

Utils.fail = function fail(msg, taskHelp) {
  try {
    events.emit('verbose', 'Utils.fail', msg, taskHelp);
    events.emit('verbose', 'Utils.fail stack', msg.stack);

    //If an error handler is set, use it. Otherwise, just print basic info.
    if (Utils.errorHandler) {
      events.emit('verbose', 'Utils.errorHandler is set, calling that now');
      return Utils.errorHandler(msg, taskHelp);
    }

    events.emit('log', 'An error occurred in Ionic App Lib and no error handler was set.');
    events.emit('log', msg);
    events.emit('log', msg.stack);
    process.exit(1);
    return '';
  } catch (ex) {
    events.emit('verbose', 'Utils.fail', ex);
    events.emit('verbose', ex.stack);
  }
}

Utils.gulpInstalledGlobally = function gulpInstalledGlobally() {
  var result = shelljs.exec('gulp -v', { silent: true });

  if(result.code != 0) {
    return false;
  }
  return true;
}
