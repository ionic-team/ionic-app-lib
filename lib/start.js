var fs = require('fs'),
    os = require('os'),
    request = require('request'),
    path = require('path'),
    parseUrl = require('url').parse,
    shelljs = require('shelljs/global'),
    shellConfig = require('shelljs').config,
    argv = require('optimist').boolean(['no-cordova', 'sass', 'list']).argv,
    prompt = require('prompt'),
    colors = require('colors'),
    Q = require('q'),
    open = require('open'),
    unzip = require('unzip'),
    xml2js = require('xml2js'),
    IonicProject = require('./project'),
    IonicStore = require('./store').IonicStore,
    // IonicStats = require('./stats').IonicStats,
    Utils = require('./utils'),
    Cordova = require('./cordova'),
    Hooks = require('./hooks'),
    ioLib = require('./io-config'),
    logging = require('./logging'),
    Login = require('./login');

var seedType = 'ionic-starter';
var Start = module.exports;
shellConfig.silent = true;

// The URL for the cordova wrapper project
var WRAPPER_REPO_NAME = 'ionic-app-base';
var IONIC_DASH = 'https://apps.ionic.io';
var IONIC_CREATOR_API_URL = 'https://creator.ionic.io/api/v1';
//var IONIC_CREATOR_API_URL = 'http://localhost:5000/api/v1';

var DEFAULT_APP = {
  "plugins": [
    "cordova-plugin-device",
    "cordova-plugin-console",
    "cordova-plugin-whitelist",
    "cordova-plugin-splashscreen",
    "cordova-plugin-statusbar",
    "ionic-plugin-keyboard"
  ],
  "sass": false
};

// Options for startApp:
// {
//   appDirectory: 'IonicApp',
//   appName: 'Test',
//   packageName: 'com.ionic.test,
//   isCordovaProject: true,
//   template: 'tabs',
//   targetPath: '/User/Path/Development/'
// }
Start.startApp = function startApp(options) {
  if(typeof options != 'object' || typeof options =='undefined') {
    throw new Error('You cannot start an app without options');
  }

  if(typeof options.targetPath == 'undefined' || options.targetPath == '.') {
    throw new Error('Invalid target path, you may not specify \'.\' as an app name');
  }

  ioLib.warnMissingData();

  var createMessage = ['Creating Ionic app in folder ', options.targetPath, ' based on ', options.template.bold, ' project'].join('');
  var errorWithStart = false;

  logging.logger.info(createMessage);

  return Start.fetchWrapper(options)
  .then(function(data){
    return Start.fetchSeed(options);
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
  .catch(function(ex) {
    errorWithStart = true;
    throw ex;
  })
  .then(function() {
    if (options.isCordovaProject) {
    //Check if iOS - if so, add platform iOS
      return Start.addDefaultPlatforms(options);
    }
  })
  .catch(function(ex) {
    if (errorWithStart) {
      throw ex;
    }
    //Might be a default error - ios already added. Ignore it.
  })
  .then(function() {
    if (options.isCordovaProject) {
      return Start.updateConfigXml(options.targetPath, options.packageName, options.appName, options.ios, options.android);
    }
  })
  .then(function(){
    return Start.setupSass(options);
  })
  .then(function(){
    return Start.finalize(options);
  })
  .catch(function(err) {
    logging.logger.error('Error Initializing app: %s', err, {});
    // throw new Error('Unable to initalize app:')
    throw err;
  })
  .fin(function(){
    return 'Completed successfully';
  });
};

Start.addDefaultPlatforms = function addDefaultPlatforms(options) {
  var currOs = os.type().toLowerCase();
  if (currOs == 'darwin') {
    logging.logger.info('Adding in iOS application by default'.yellow);
    //Try to install default platform
    return Cordova.addPlatform(options.targetPath, 'ios', true);
  } else {
    return Q();
  }
};

Start.fetchWrapper = function fetchWrapper(options) {
  var q = Q.defer();
  // var self = this;

  var repoUrl = 'https://github.com/driftyco/' + WRAPPER_REPO_NAME + '/archive/master.zip';

  Utils.fetchArchive(options.targetPath, repoUrl)
  .then(function() {
    var repoFolderName = WRAPPER_REPO_NAME + '-master';
    cp('-R', options.targetPath + '/' + repoFolderName + '/.', options.targetPath);
    rm('-rf', options.targetPath + '/' + repoFolderName + '/');
    cd(options.targetPath);

    if(!options.isCordovaProject) {
      // remove any cordova files/directories if they only want the www
      var cordovaFiles = ['hooks/', 'platforms/', 'plugins/', 'config.xml'];
      for(var x=0; x<cordovaFiles.length; x++) {
        rm('-rf', options.targetPath + '/' + cordovaFiles[x]);
      }
    }

    q.resolve();
  }, function(err) {
    q.reject(err);
  }).catch(function(err) {
    q.reject('Error: Unable to fetch wrapper repo: ' + err);
    // return self.ionic.fail('Error: Unable to fetch wrapper repo: ' + err);
  });

  return q.promise;
}

//Tested
Start.fetchSeed = function(options) {
  // Codepen: http://codepen.io/ionic/pen/GpCst
  if( /\/\/codepen.io\//i.test(options.template) ) {
    seedType = 'codepen';
    return Start.fetchCodepen(options);
  }

  if(/plnkr.co\//i.test(options.template)) {
    seedType = 'plnkr';
    return Start.fetchPlnkr(options);
  }

  if( /creator:/i.test(options.template) ) {
    seedType = 'creator';
    return Start.fetchCreatorApp(options);
  }

  // Github URL: http://github.com/myrepo/
  if( /\/\/github.com\//i.test(options.template) ) {
    seedType = 'github';
    return Start.fetchGithubStarter(options, options.template);
  }

  //Fix for downloading zip files: https://github.com/driftyco/ionic-cli/issues/526
  if (options.zipFileDownload) {
    return Start.fetchZipStarter(options);
  }

  // Local Directory: /User/starterapp
  if( (options.template.indexOf('/') > -1 || options.template.indexOf('\\') > -1) && (options.template.indexOf('http://') === -1 && options.template.indexOf('https://') === -1)) {
    // TODO: seedType - how to pass back?
    seedType = 'local';
    return Start.fetchLocalStarter(options);
  }

  // Ionic Github Repo
  seedType = 'ionic-starter';
  return Start.fetchIonicStarter(options);
};

//Not Tested
Start.loadAppSetup = function loadAppSetup(options) {
  var appSetup = DEFAULT_APP;
  var appJsonPath = path.join(options.targetPath, 'www', 'app.json');

  if(fs.existsSync(appJsonPath)) {
    try {
      appSetup = JSON.parse( fs.readFileSync(appJsonPath) );
      rm('-rf', appJsonPath);
    } catch(e) {
      logging.logger.error('app.json error: %s', e, {});
    }
  }

  return appSetup;
};

//Not Tested
Start.fetchCreatorApp = function(options) {
  var unzip = require('unzip2');

  var cookies = new IonicStore('cookies').get('https://apps.ionic.io');

  var sessionId;

  if(cookies) {
    cookies.forEach(function(cookie) {
      if(cookie.key == 'sessionid') {
        sessionId = cookie.value;
      }
    });
  }

  if(!sessionId) {
    logging.logger.error('\nPlease log in before starting a creator project. Run:\n\nionic login\n\n');
    process.exit(1);
  } else {
    return _fetchCreatorApp();
  }

  function _fetchCreatorApp() {
    // var self = this;
    var appId = options.template.split(':')[1];
    //var downloadUrl = IONIC_DASH + path.join('/api/v1/creator', appId, 'download/html');
    var downloadUrl = IONIC_CREATOR_API_URL + path.join('/creator/' + appId + '/download-start/cordova?sid=' + sessionId);
    var wwwPath = path.join(options.targetPath, 'www/');

    logging.logger.info('\nDownloading Creator Project:'.bold, downloadUrl);

    var q = Q.defer();

    var proxy = process.env.PROXY || null;

    request({ url: downloadUrl, proxy: proxy, encoding: null }, function(err, res, body) {
      if(!err && res && res.statusCode === 200) {
        //html = self.convertTemplates(html);

        var tmpFolder = os.tmpdir();
        var tempZipFilePath = path.join(tmpFolder, 'ionic-creator-' + new Date().getTime() + '.zip');

        try {
          fs.writeFileSync(tempZipFilePath, body);

          var readStream = fs.createReadStream(tempZipFilePath);
          readStream.on('error', function(err) {
            logging.logger.debug(('unzipRepo readStream: ' + err).error);
            q.reject(err);
          });

          var writeStream = unzip.Extract({ path: wwwPath });
          writeStream.on('close', function() {
            q.resolve();
          });
          writeStream.on('error', function(err) {
            logging.logger.debug(('unzipRepo writeStream: ' + err).error);
            q.reject(err);
          });
          readStream.pipe(writeStream);
        } catch(e) {
          console.error(e);
          q.reject(e);
        }

      } else {
        q.reject(res);
      }
    });
    return Q.all([q]);
  }
};

Start.fetchCodepen = function(options) {
  var codepenUrl = options.template.split('?')[0].split('#')[0];
  var wwwPath = path.join(options.targetPath, 'www');

  if (codepenUrl[codepenUrl.length - 1] == '/') {
    codepenUrl = codepenUrl.substr(0, codepenUrl.length - 1);
  }

  logging.logger.info('Downloading Codepen: ', codepenUrl.green.bold);

  var qHTML = Q.defer();
  var qCSS = Q.defer();
  var qJS = Q.defer();

  var proxy = process.env.PROXY || process.env.http_proxy || null;

  request({ url: codepenUrl + '.html', proxy: proxy }, function(err, res, html) {
    if(!err && res && res.statusCode === 200) {
      html = html || '';

      if(html.indexOf('<!DOCTYPE html>') < 0) {
        html = '<!DOCTYPE html>\n' + html;
      }

      var resources = '    <link href="css/style.css" rel="stylesheet">\n' +
                      '    <script src="js/app.js"></script>\n';

      if(options.isCordovaProject) {
        resources += '    <script src="cordova.js"></script>\n';
      }

      resources += '  </head>';

      html = html.replace(/<\/head>/i, '\n' + resources);

      html = Start.convertTemplates(html);

      fs.writeFileSync(path.join(wwwPath, 'index.html'), html, 'utf8');
    }
    qHTML.resolve();
  });

  request({ url: codepenUrl + '.css', proxy: proxy }, function(err, res, css) {
    if(!err && res && res.statusCode === 200) {
      css = css || '';

      var cssPath = path.join(wwwPath, 'css');
      if(!fs.existsSync(cssPath)) {
        fs.mkdirSync(cssPath);
      }
      css = css.replace("cursor: url('http://ionicframework.com/img/finger.png'), auto;", '');
      fs.writeFileSync(path.join(cssPath, 'style.css'), css, 'utf8');
    }
    qCSS.resolve();
  });

  request({ url: codepenUrl + '.js', proxy: proxy }, function(err, res, js) {
    if(!err && res && res.statusCode === 200) {
      js = js || '';

      var jsPath = path.join(wwwPath, 'js');
      if(!fs.existsSync(jsPath)) {
        fs.mkdirSync(jsPath);
      }
      fs.writeFileSync(path.join(jsPath, 'app.js'), js, 'utf8');
    }
    qJS.resolve();
  });

  return Q.all([qHTML.promise, qCSS.promise, qJS.promise]);
};


Start.convertTemplates = function(html, targetPath) {
  var templates = [];
  // var self = this;

  try {
    var scripts = html.match(/<script [\s\S]*?<\/script>/gi);
    scripts.forEach(function(scriptElement){
      if(scriptElement.indexOf('text/ng-template') > -1) {

        var lines = scriptElement.split('\n');
        for(var x=0; x<lines.length; x++) {
          try {
            if(lines[x].substr(0, 6) === '      ') {
              lines[x] = lines[x].substr(6);
            }
          } catch(lE){}
        }
        var data = lines.join('\n');

        var id = data.match(/ id=["|'](.*?)["|']/i)[0];
        id = id.replace(/'/g, '"').split('"')[1];

        data = data.replace(/<script [\s\S]*?>/gi, '');
        data = data.replace(/<\/script>/gi, '');
        data = data.trim();

        templates.push({
          path: id,
          scriptElement: scriptElement,
          html: data
        });

      }
    });
  }catch(e){}

  try {

    templates.forEach(function(tmpl){

      var tmpPath = path.join(targetPath, 'www', path.dirname(tmpl.path));
      if(!fs.existsSync(tmpPath)) {
        fs.mkdirSync(tmpPath);
      }

      tmpPath = path.join(targetPath, 'www', tmpl.path);
      fs.writeFileSync(tmpPath, tmpl.html, 'utf8');

      html = html.replace( tmpl.scriptElement, '' );
      html = html.replace( /    \n    \n/g, '' );
    });

  }catch(e){}

  return html;
};


Start.fetchLocalStarter = function(options) {
  var q = Q.defer();

  try {
    cd('..');

    var localStarterPath = path.resolve(options.template);

    if( !fs.existsSync(localStarterPath) ) {
      self.ionic.fail('Unable to find local starter template: ' + localStarterPath);
      q.reject();
      return q.promise;
    }

    logging.logger.info('\nCopying files to www from:'.bold, localStarterPath);

    // Move the content of this repo into the www folder
    cp('-Rf', path.join(localStarterPath, '*'), path.join(options.targetPath, 'www'));

    q.resolve();
  } catch(e) {
    q.reject(e);
  }

  cd(options.targetPath);

  return q.promise;
};


Start.fetchIonicStarter = function(options) {

  // Get the starter project repo name:
  var repoName = ['ionic-starter-', options.template].join('')

  // Get the URL for the starter project repo:
  var repoUrl = ['https://github.com/driftyco/', repoName].join('')

  return Start.fetchGithubStarter(options, repoUrl);
};


Start.fetchGithubStarter = function(options, repoUrl) {
  // var self = this;
  var q = Q.defer();

  // https://github.com/driftyco/ionic-starter-tabs/
  var urlParse = parseUrl(repoUrl);
  var pathSplit = urlParse.pathname.replace(/\//g, ' ').trim().split(' ');
  if(!urlParse.hostname || urlParse.hostname.toLowerCase() !== 'github.com' || pathSplit.length !== 2) {
    logging.logger.error(('Invalid Github URL: ' + repoUrl).error );
    logging.logger.error(('Example of a valid URL: https://github.com/driftyco/ionic-starter-tabs/').error );
    Utils.fail('');
    q.reject();
    return q.promise;
  }
  var repoName = pathSplit[1];
  var repoFolderName = repoName + '-master';

  // ensure there's an ending /
  if(repoUrl.substr(repoUrl.length -1) !== '/') {
    repoUrl += '/';
  }
  repoUrl += 'archive/master.zip';

  Utils.fetchArchive(options.targetPath, repoUrl).then(function() {

    try {
      // Move the content of this repo into the www folder
      cp('-Rf', options.targetPath + '/' + repoFolderName + '/.', 'www');

      // Clean up start template folder
      rm('-rf', options.targetPath + '/' + repoFolderName + '/');

      q.resolve();

    } catch(e) {
      q.reject(e);
    }

  }).catch(function(err) {
    logging.logger.error('Please verify you are using a valid URL or a valid ionic starter.');
    logging.logger.error('View available starter templates: `ionic start --list`');
    logging.logger.error('More info available at: \nhttp://ionicframework.com/getting-started/\nhttps://github.com/driftyco/ionic-cli');
    return Utils.fail('');
  });

  return q.promise;
};

Start.fetchZipStarter = function fetchZipStarter(options) {
  var q = Q.defer();
  var repoFolderName = 'zipFileDownload';

  logging.logger.info('Fetching ZIP from url:', options.zipFileDownload.bold, 'to: ', options.targetPath);

  Utils.fetchArchive(options.targetPath, options.zipFileDownload)
  .then(function() {

    try {
      // Move the content of this repo into the www folder
      cp('-Rf', options.targetPath + '/' + repoFolderName + '/.', '/.');

      // Clean up start template folder
      rm('-rf', options.targetPath + '/' + repoFolderName + '/');

      q.resolve();

    } catch(e) {
      q.reject(e);
    }

  }).catch(function(err) {
    logging.logger.error(err);
    logging.logger.error('Please verify you are using a valid URL or a valid ionic starter.');
    logging.logger.error('View available starter templates: `ionic templates`');
    logging.logger.error('More info available at: \nhttp://ionicframework.com/getting-started/\nhttps://github.com/driftyco/ionic-cli');

    return Utils.fail('');
  });

  return q.promise;
};

Start.fetchPlnkr = function fetchPlnkr(options) {
  // var self = this;
  var q = Q.defer();

  var plnkrUrl = options.template.split('?')[0].split('#')[0];

  var plnkrId = null;

  //Given any of these urls - we need to extract the ID
  //http://embed.plnkr.co/dFvL8n/preview
  //http://run.plnkr.co/plunks/dFvL8n/#/tabs/friends
  //http://api.plnkr.co/plunks/dFvL8n

  // http://embed.plnkr.co/BZrnKPlCJt93orQp58H3/preview

  //To download, we want http://api.plnkr.co/plunks/dFvL8n.zip

  if (plnkrUrl[plnkrUrl.length - 1] == '/') {
    plnkrUrl = plnkrUrl.substr(0, plnkrUrl.length -1);
  }

  var plnkrSplit = plnkrUrl.split('/');

  // api link - need zip on end.
  if (plnkrUrl.indexOf('embed.plnkr.co') != -1) {
    plnkrId = plnkrSplit[3];
  } else if (plnkrUrl.indexOf('run.plnkr.co') != -1 || plnkrUrl.indexOf('api.plnkr.co') != -1) {
    plnkrId = plnkrSplit[plnkrSplit.length - 1];

    if(plnkrId.indexOf('.zip') != -1) {
      plnkrId = plnkrId.replace('.zip', '')
    }
  }

  plnkrUrl = ['http://api.plnkr.co/plunks/', plnkrId, '.zip'].join('');

  logging.logger.info('\nDownloading Plnkr url:', plnkrUrl)

  var extractPath = path.join(options.targetPath, 'plnkr');

  Utils.fetchArchive(extractPath, plnkrUrl)
  .then(function() {
    try {
      // Move the content of this repo into the www folder
      var copyDir = [extractPath, '/*'].join('');
      cp('-Rf', copyDir, 'www');
      // Clean up start template folder
      rm('-rf', extractPath + '/');
      q.resolve();

    } catch(e) {
      q.reject(e);
    }
  })

  return q.promise;
};

//New initCordova method intended for GUI - to use cordova-lib commands instead of CLI.
Start.initCordovaFromGui = function initCordovaFromGui(options, appSetup) {
  var q = Q.defer();

  logging.logger.debug('Initializing Cordova for Gui');

  try {
    if (options.isCordovaProject) {
      Hooks.setHooksPermission(options.targetPath);
      logging.logger.info('Update Config.xml'.green.bold);

      appSetup.bower = appSetup.bower ? appSetup.bower : [];

      var promises = [];

      // // add plugins
      for (var x = 0; x < appSetup.plugins.length; x++) {
        promises.push(Cordova.addPlugin(options.targetPath, appSetup.plugins[x], null, true));
      }

      // platform add android with --android flag
      if (options.android) {
        promises.push(Cordova.addPlatform(options.targetPath, 'android', true));
      }

      // platform add ios with --android flag
      if (options.ios) {
        promises.push(Cordova.addPlatform(options.targetPath, 'ios', true));
      }

      logging.logger.info('Initializing cordova project'.green.bold);

      Q.all(promises)
      .then(function() {
        q.resolve();
      })
      .catch(function(ex) {
        q.reject(ex);
        throw ex;
      })
      q.resolve();

    } else {
      q.resolve();
    }
  } catch (ex) {
    logging.logger.debug('Exception caught in initCordova: %s', ex, {});
    logging.logger.debug('Exception details: %s', ex.stack, {});
    q.reject(ex);
  }

  return q.promise;
};

Start.initCordova = function(options, appSetup) {
  var q = Q.defer();

  try {
    if (options.isCordovaProject) {
      Hooks.setHooksPermission(options.targetPath);
      logging.logger.info('Update Config.xml'.green.bold);

      appSetup.bower = appSetup.bower ? appSetup.bower : [];

      // var promises = [];

      // // // add plugins
      // for (var x = 0; x < appSetup.plugins.length; x++) {
      //   promises.push(Cordova.addPlugin(options.targetPath, appSetup.plugins[x], null, true));
      // }

      // // platform add android with --android flag
      // if (options.android) {
      //   promises.push(Cordova.addPlatform(options.targetPath, 'android', true));
      // }

      // // platform add ios with --android flag
      // if (options.ios) {
      //   promises.push(Cordova.addPlatform(options.targetPath, 'ios', true));
      // }

      var cmds = [];

      // add plugins
      for(var x = 0; x < appSetup.plugins.length; x++) {
       cmds.push('ionic plugin add ' + appSetup.plugins[x]);
      }

      if (appSetup.bower) {
        // add bower packages
        for(var y = 0; y < appSetup.bower.length; y++) {
          cmds.push('ionic add ' + appSetup.bower[y]);
        }
      }

      // platform add android with --android flag
      if(options.android) {
       cmds.push('ionic platform add android');
      }

      // platform add ios with --android flag
      if(options.ios) {
       cmds.push('ionic platform add ios');
      }

      exec(cmds.join(' && '),
        function(err, stdout, stderr) {
           if(err) {
             Utils.fail('Unable to add plugins. Perhaps your version of Cordova is too old. ' +
                             'Try updating (npm install -g cordova), removing this project folder, and trying again.');
             q.reject(stderr);
           } else {
             q.resolve(stdout);
           }
      });

      // Start.updateConfigXml(options.targetPath, options.packageName, options.appName, options.ios, options.android);

      logging.logger.info('Initializing cordova project'.green.bold);
      // Q.all(promises)
      // .then(function() {
      //   q.resolve();
      // })
      // .catch(function(ex) {
      //   q.reject(ex);
      //   throw ex;
      // })
      // q.resolve();

    } else {
      q.resolve();
    }
  } catch (ex) {
    logging.logger.debug('Exception caught in initCordova: %s', ex, {});
    logging.logger.debug('Exception details: %s', ex.stack, {});
    q.reject(ex);
  }

  return q.promise;
};

Start.updateConfigXml = function(targetPath, packageName, appName, ios, android) {
  try {
    var configXmlPath = targetPath + '/config.xml';
    var configString = fs.readFileSync(configXmlPath, { encoding: 'utf8' });

    var parseString = xml2js.parseString;
    parseString(configString, function (err, jsonConfig) {
      if(err) {
        return self.ionic.fail('Error parsing config.xml: ' + err);
      }

      if(!packageName) {
        var directoryName = path.basename(targetPath);
        packageName = directoryName + (directoryName !== 'tmp' ? Math.round((Math.random() * 899999) + 100000) : '');
        packageName = 'com.ionicframework.' + packageName.replace(/\./g, '');
      }

      jsonConfig.widget.$.id = packageName.replace(/ /g, '').replace(/-/g, '').replace(/_/g, '').toLowerCase().trim();
      jsonConfig.widget.name = [ appName ];

      var xmlBuilder = new xml2js.Builder();
      configString = xmlBuilder.buildObject(jsonConfig);

      fs.writeFile(configXmlPath, configString, 'utf8', function(err) {
        if(err) {
          return self.ionic.fail('Error saving config.xml file: ' + err);
        }
      });
    });

  } catch(e) {
    // return self.ionic.fail('Error updating config.xml file: ' + e);
    logging.logger.error('Error updating config.xml file: %s', e, {})
    return
  }
};


Start.setupSass = function(options) {
  if(options.setupSass) {
    // auto setup sass if they set the option
    // logging.logger.info('setup sass');
    var IonicSetupTask = require('./setup').IonicTask
    var setupTask = new IonicSetupTask();
    hasSass = true;
    return setupTask.sassSetup();
  }

  // didn't ask to setup sass, so resolve it
  var q = Q.defer();
  q.resolve();
  return q.promise;
};


Start.updateLibFiles = function(libPath) {
  // var libPath = argv.lib || argv.l || 'lib/ionic';

  // create a symlink if the path exists locally
  var libSymlinkPath = path.resolve(libPath);
  if( fs.existsSync(libSymlinkPath) ) {
    // rename the existing lib/ionic directory before creating symlink
    var wwwIonicCssPath = path.resolve('www/lib/ionic/css');
    if( fs.existsSync(wwwIonicCssPath) ) {
      mv( wwwIonicCssPath, path.resolve('www/lib/ionic/css_local') );
    }

    var wwwIonicJsPath = path.resolve('www/lib/ionic/js');
    if( fs.existsSync(wwwIonicJsPath) ) {
      mv( wwwIonicJsPath, path.resolve('www/lib/ionic/js_local') );
    }

    var wwwIonicFontsPath = path.resolve('www/lib/ionic/fonts');
    if( fs.existsSync(wwwIonicFontsPath) ) {
      mv( wwwIonicFontsPath, path.resolve('www/lib/ionic/fonts_local') );
    }

    var libCssSymlinkPath = path.join(libSymlinkPath, 'css');
    logging.logger.info('Create www/lib/ionic/css symlink to ' + libCssSymlinkPath);
    fs.symlinkSync(libCssSymlinkPath, wwwIonicCssPath);

    var libJsSymlinkPath = path.join(libSymlinkPath, 'js');
    logging.logger.info('Create www/lib/ionic/js symlink to ' + libJsSymlinkPath);
    fs.symlinkSync(libJsSymlinkPath, wwwIonicJsPath);

    var libFontsSymlinkPath = path.join(libSymlinkPath, 'fonts');
    logging.logger.info('Create www/lib/ionic/fonts symlink to ' + libFontsSymlinkPath);
    fs.symlinkSync(libFontsSymlinkPath, wwwIonicFontsPath);

    libPath = 'lib/ionic';
  }

  if(libPath == 'lib/ionic' && (seedType == 'ionic-starter' || /ionic-starter/i.test(this.template))) {
    // don't bother if its still is the default which comes with the starters
    return;
  }

  // path did not exist locally, so manually switch out the path in the html
  var libFiles = 'ionic.css ionic.min.css ionic.js ionic.min.js ionic.bundle.js ionic.bundle.min.js ionic-angular.js ionic-angular.min.js'.split(' ');

  function isLibFile(tag) {
    if(tag) {
      tag = tag.toLowerCase();
      for(var x=0; x<libFiles.length; x++) {
        if( tag.indexOf(libFiles[x]) > -1 ) {
          return true;
        }
      }
    }
  }

  function changeLibPath(originalUrl) {
    var splt = originalUrl.split('/');
    var newUrl = [ libPath ];
    var filename = splt[ splt.length - 1 ];

    if(filename.indexOf('.css') > -1) {
      newUrl.push('css');
    } else if(filename.indexOf('.js') > -1) {
      newUrl.push('js');
    }

    newUrl.push(filename);

    return newUrl.join('/');
  }

  function replaceResource(html, originalTag) {
    originalTag = originalTag.replace(/'/g, '"');
    var splt = originalTag.split('"');
    var newTagArray = [];

    for(var x=0; x<splt.length; x++) {
      if( isLibFile(splt[x]) ) {
        newTagArray.push( changeLibPath(splt[x]) );
      } else {
        newTagArray.push( splt[x] );
      }
    }

    var newTag = newTagArray.join('"');

    return html.replace(originalTag, newTag);
  }

  function getLibTags(html) {
    var resourceTags = [];
    var libTags = [];

    try{
      resourceTags = resourceTags.concat( html.match(/<script (.*?)>/gi) );
    }catch(e){}

    try{
      resourceTags = resourceTags.concat( html.match(/<link (.*?)>/gi) );
    }catch(e){}

    for(var x=0; x<resourceTags.length; x++) {
      if( isLibFile(resourceTags[x]) ) {
        libTags.push(resourceTags[x]);
      }
    }

    return libTags;
  }

  try {
    logging.logger.info('Replacing Ionic lib references with ' + libPath);
    var indexPath = path.join(this.targetPath, 'www', 'index.html');
    var html = fs.readFileSync(indexPath, 'utf8');

    var libTags = getLibTags(html);

    for(var x=0; x<libTags.length; x++) {
      var originalTag = libTags[x];

      html = replaceResource(html, originalTag);
    }

    fs.writeFileSync(indexPath, html, 'utf8');

  } catch(e) {
    // this.ionic.fail('Error updating lib files: ' + e);
  }
};

Start.promptLogin = function() {
  var q = Q.defer();

  var ionicConfig = new IonicStore('ionic.config');

  if(ionicConfig) {
    // Check if we already asked
    var didPrompt = ionicConfig.get('accountPrompt');
    if(didPrompt == 'y') {
      logging.logger.info('\n' + 'New!'.green.bold + ' Add push notifications, live app updates, and more with Ionic Platform!'.bold);
      logging.logger.info('  ' + IONIC_DASH + '/signup\n');
      return;
    }
    ionicConfig.set('accountPrompt', 'y');
    ionicConfig.save();
  }

  logging.logger.info('\nCreate an ionic.io account to send Push Notifications and use the Ionic View app?');

  var promptProperties = {
    shouldCreate: {
      name: 'shouldCreate',
      description: '(Y/n):'.yellow.bold,
    }
  };

  prompt.override = argv;
  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  prompt.get({properties: promptProperties}, function (err, promptResult) {
    if(err) {
      q.reject(err);
      return logging.logger.error(err);
    }

    var areYouSure = promptResult.shouldCreate.toLowerCase().trim();
    if(areYouSure.toLowerCase() != 'n') {
      // If they want to, let's open a thing
      open(IONIC_DASH + '/signup');
      q.resolve(true);
      return;
    }
    //They didnt want to set up account.
    q.resolve(false);

  });

  return q.promise;
};

Start.finalize = function(options) {
  try {
    var packageFilePath = path.join(options.targetPath, 'package.json');
    var packageData = require(packageFilePath);
    packageData.name = encodeURIComponent( options.appName.toLowerCase().replace(/\s+/g, '-') );
    packageData.description = options.appName + ': An Ionic project';
    fs.writeFileSync(packageFilePath, JSON.stringify(packageData, null, 2), 'utf8');
  } catch(e) {
    logging.logger.error('There was an error finalizing the package.json file. %s', e, {});
  }

  try {
    // create the ionic.project file and
    // set the app name
    var project = IonicProject.create(options.targetPath, options.appName);
    project.set('name', options.appName);

    if (options.ionicAppId) {
      project.set('app_id', options.ionicAppId);
    }

    project.save(options.targetPath);
    logging.logger.debug('Saved project file');
  } catch(e) {
    logging.logger.error('Error saving project file');
  }

  try {
    // update the app name in the bower.json file
    var ionicBower = require('./bower').IonicBower;
    ionicBower.setAppName(options.appName);
  } catch(e) {}

  try {
    // remove the README file in the root because it
    // doesn't make sense because its the README for the repo
    // and not helper text while developing an app
    fs.unlinkSync(options.targetPath + '/README.md');
  } catch(e) {}

  try {
    // remove the README file in the www root because it
    // doesn't make sense because its the README for the repo
    // and not helper text while developing an app
    fs.unlinkSync(options.targetPath + '/www/README.md');
  } catch(e) {}

  // Start.printQuickHelp();

  // Start.ionic.printNewsUpdates(true).then(function() {
    // self.promptLogin();
  // });

};

Start.printQuickHelp = function(options) {
  logging.logger.info('\n♬ ♫ ♬ ♫  Your Ionic app is ready to go! ♬ ♫ ♬ ♫'.bold);
  logging.logger.info('\nMake sure to cd into your new app directory:'.bold);
  logging.logger.info('  cd ' + options.appName);
  logging.logger.info('\nTo run your app in the browser (great for initial development):'.bold);
  logging.logger.info('  ionic serve');
  logging.logger.info('\nTo run on iOS:'.bold);
  logging.logger.info('  ionic run ios');
  logging.logger.info('\nTo run on Android:'.bold);
  logging.logger.info('  ionic run android');
  logging.logger.info('\nTo test your app on a device easily, try Ionic View:'.bold);
  logging.logger.info('  http://view.ionic.io');
};

Start.promptForOverwrite = function promptForOverwrite(targetPath) {
  var q = Q.defer();

  logging.logger.info('The directory'.error.bold, targetPath, 'already exists.'.error.bold);
  logging.logger.info('Would you like to overwrite the directory with this new project?');

  var promptProperties = {
    areYouSure: {
      name: 'areYouSure',
      description: '(yes/no):'.yellow.bold,
      required: true
    }
  };

  prompt.override = argv;
  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  prompt.get({properties: promptProperties}, function (err, promptResult) {
    if(err && err.message !== 'canceled') {
      q.reject(err);
      return logging.logger.error(err);
    } else if (err && err.message == 'canceled') {
      return q.resolve(false);
    }

    var areYouSure = promptResult.areYouSure.toLowerCase().trim();
    if (areYouSure == 'yes' || areYouSure == 'y') {
      rm('-rf', targetPath);
      q.resolve(true);
    } else {
      q.resolve(false);
    }
  });

  return q.promise;
};


// module.exports = {
//   IonicTask: IonicTask,
//   fetchWrapper: fetchWrapper
// }
// Start.startApp = startApp;
