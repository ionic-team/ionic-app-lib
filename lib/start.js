var chalk = require('chalk');
var fs = require('fs');
var os = require('os');
var request = require('request');
var path = require('path');
var shelljs = require('shelljs');
var parseUrl = require('url').parse;
var argv = require('optimist').boolean(['no-cordova', 'sass', 'list']).argv;
var prompt = require('prompt');
var Q = require('q');
var open = require('open');
var xml2js = require('xml2js');
var ProgressBar = require('progress');
var IonicProject = require('./project');
var IonicStore = require('./store').IonicStore;
var Utils = require('./utils');
var Cordova = require('./cordova');
var Hooks = require('./hooks');
var ioLib = require('./io-config');
var log = require('./logging').logger;
var IonicResources = require('./resources');
var State = require('./state');

var seedType = 'ionic-starter';
var Start = module.exports;
var IONIC_DASH = 'https://apps.ionic.io';
var IONIC_CREATOR_API_URL = 'https://creator.ionic.io/api/v1';

var DEFAULT_APP = {
  plugins: [
    'cordova-plugin-device',
    'cordova-plugin-console',
    'cordova-plugin-whitelist',
    'cordova-plugin-splashscreen',
    'cordova-plugin-statusbar',
    'ionic-plugin-keyboard'
  ],
  sass: false
};

var V2_STARTERS = {
  blank: { repoName: 'ionic2-starter-blank' },
  tabs: { repoName: 'ionic2-starter-tabs' },
  sidemenu: { repoName: 'ionic2-starter-sidemenu' },
  conference: { repoName: 'ionic-conference-app' },
  tutorial: { repoName: 'ionic2-starter-tutorial' },
  super: { repoName: 'ionic-starter-super' }
};

Start.runSpawnCommand = function runSpawnCommand(cmd, args) {
  var q = Q.defer();
  var command = cmd + args.join(' ');
  var spawn = require('cross-spawn');

  log.debug('Running exec command:', command);
  var spawned = spawn(cmd, args, { stdio: 'ignore' });
  spawned.on('error', function(err) {
    Utils.fail('Unable to run spawn command' + err);
  });
  spawned.on('exit', function(code) {
    log.debug('Spawn command completed');
    if (code !== 0) {
      return q.reject('There was an error with the spawned command: ' + command);
    }
    return q.resolve();
  });

  return q.promise;
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
  if (typeof options != 'object' || typeof options == 'undefined') {
    throw new Error('You cannot start an app without options');
  }

  if (typeof options.targetPath == 'undefined' || options.targetPath === '.') {
    throw new Error('Invalid target path, you may not specify \'.\' as an app name');
  }

  ioLib.warnMissingData();

  var createMessage = ['Creating an Ionic', options.v2 ? ' 2.x' : '', ' app in ', options.targetPath, ' based on the ',
    chalk.bold(options.template), ' template.\n'].join('');
  var errorWithStart = false;

  log.info(createMessage);

  return Start.fetchWrapper(options)
  .then(function() {
    return Start.fetchSeed(options);
  })
  .then(function() {
    if (!options.skipNpm) {
      log.info('Installing npm packages (may take a minute or two)...');
      return Start.runSpawnCommand('npm', ['install']);
    }
  })
  .then(function() {
    return Start.loadAppSetup(options);
  })
  .then(function(appSetup) {
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

      // Check if iOS - if so, add platform iOS
      return Start.addDefaultPlatforms(options);
    }
  })
  .catch(function(ex) {
    if (errorWithStart) {
      log.error('Error with start', ex.stack);
      throw ex;
    }

    // Might be a default error - ios already added. Ignore it.
  })
  .then(function() {
    if (options.isCordovaProject) {
      return Start.updateConfigXml(options.targetPath, options.packageName,
                                   options.appName, options.ios, options.android);
    }
  })
  .then(function() {
    return Start.finalize(options);
  })
  .catch(function(err) {
    log.error('Error Initializing app: %s', err, {});
    throw err;
  })
  .fin(function() {
    return 'Completed successfully';
  });
};

Start.addDefaultPlatforms = function addDefaultPlatforms(options) {
  var currOs = os.type().toLowerCase();

  if (currOs === 'darwin') {
    //log.info('\nAdding in iOS application by default');

    // Try to install default platform
    return Cordova.addPlatform(options.targetPath, 'ios', true)
    .then(function() {
      return IonicResources.copyIconFilesIntoResources(options.targetPath, false);
    })
    .then(function() {
      return IonicResources.addIonicIcons(options.targetPath, 'ios');
    });
  } else {
    return Q();
  }
};

Start.fetchWrapper = function fetchWrapper(options) {
  var q = Q.defer();
  var wrapperRepoName = options.v2 ? 'ionic2-app-base' : 'ionic-app-base';
  var wrapperBranchName = options.wrapperBranchName ? options.wrapperBranchName : 'master';
  var repoUrl = 'https://github.com/driftyco/' + wrapperRepoName + '/archive/' + wrapperBranchName + '.zip';

  Utils.fetchArchive(options.targetPath, repoUrl)
  .then(function() {
    var repoFolderName = wrapperRepoName + '-' + wrapperBranchName;

    // Copy contents of starter template into base, overwriting if already exists
    shelljs.cp('-R', options.targetPath + '/' + repoFolderName + '/.', options.targetPath);
    shelljs.rm('-rf', options.targetPath + '/' + repoFolderName + '/');
    shelljs.cd(options.targetPath);

    if (!options.isCordovaProject) {

      // remove any cordova files/directories if they only want the www
      var cordovaFiles = ['hooks/', 'platforms/', 'plugins/', 'config.xml'];
      for (var x = 0; x < cordovaFiles.length; x += 1) {
        shelljs.rm('-rf', options.targetPath + '/' + cordovaFiles[x]);
      }
    }

    q.resolve();
  }, function(err) {
    q.reject(err);
  }).catch(function(err) {
    q.reject('Error: Unable to fetch wrapper repo: ' + err);
  });

  return q.promise;
};

// Tested
Start.fetchSeed = function(options) {

  // Codepen: http://codepen.io/ionic/pen/GpCst
  if (/\/\/codepen.io\//i.test(options.template)) {
    seedType = 'codepen';
    return Start.fetchCodepen(options);
  }

  if (/plnkr.co\//i.test(options.template)) {
    seedType = 'plnkr';
    return Start.fetchPlnkr(options);
  }

  if (/creator:/i.test(options.template)) {
    seedType = 'creator';
    return Start.fetchCreatorApp(options);
  }

  // Github URL: http://github.com/myrepo/
  if (/\/\/github.com\//i.test(options.template)) {
    seedType = 'github';
    return Start.fetchGithubStarter(options, options.template);
  }

  // Fix for downloading zip files: https://github.com/driftyco/ionic-cli/issues/526
  if (options.zipFileDownload) {
    return Start.fetchZipStarter(options);
  }

  // Local Directory: /User/starterapp
  if ((options.template.indexOf('/') > -1 || options.template.indexOf('\\') > -1) &&
      (options.template.indexOf('http://') === -1 && options.template.indexOf('https://') === -1)) {

    // TODO: seedType - how to pass back?
    seedType = 'local';
    return Start.fetchLocalStarter(options);
  }

  // Ionic Github Repo
  seedType = 'ionic-starter';
  return Start.fetchIonicStarter(options);
};

// Not Tested
Start.loadAppSetup = function loadAppSetup(options) {
  var appSetup = DEFAULT_APP;
  var appJsonPath = path.join(options.targetPath, 'www', 'app.json');

  if (fs.existsSync(appJsonPath)) {
    try {
      appSetup = JSON.parse(fs.readFileSync(appJsonPath));
      shelljs.rm('-rf', appJsonPath);
    } catch (e) {
      log.error('app.json error: %s', e, {});
    }
  }

  return appSetup;
};

// Not Tested
Start.fetchCreatorApp = function(options) {
  var cookies = new IonicStore('cookies').get('https://apps.ionic.io');

  var sessionId;

  if (cookies) {
    cookies.forEach(function(cookie) {
      if (cookie.key === 'sessionid') {
        sessionId = cookie.value;
      }
    });
  }

  if (!sessionId) {
    log.error('\nPlease log in before starting a creator project. Run:\n\nionic login\n\n');
    process.exit(1);
  } else {
    return fetchCreatorApplication();
  }

  function fetchCreatorApplication() {
    var AdmZip = require('adm-zip');

    // var self = this;
    var appId = options.template.split(':')[1];
    var downloadUrl = IONIC_CREATOR_API_URL + path.join('/creator/' + appId +
                                                        '/download-start/cordova?sid=' + sessionId);
    var wwwPath = path.join(options.targetPath, 'www/');

    log.info(chalk.bold('\nDownloading Creator Project:'), downloadUrl);

    var q = Q.defer();

    var proxy = Utils.getProxy();

    request({ url: downloadUrl, proxy: proxy, encoding: null }, function(err, res, body) {
      if (!err && res && parseInt(res.statusCode, 10) === 200) {
        var tmpFolder = os.tmpdir();
        var tempZipFilePath = path.join(tmpFolder, 'ionic-creator-' + new Date().getTime() + '.zip');

        try {
          fs.writeFileSync(tempZipFilePath, body);
          var zip = new AdmZip(tempZipFilePath);
          zip.extractAllTo(wwwPath);
          q.resolve();
        } catch (e) {
          log.error(e);
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

  if (codepenUrl[codepenUrl.length - 1] === '/') {
    codepenUrl = codepenUrl.substr(0, codepenUrl.length - 1);
  }

  log.info('Downloading Codepen: ', codepenUrl);

  var qHTML = Q.defer();
  var qCSS = Q.defer();
  var qJS = Q.defer();

  var proxy = process.env.PROXY || process.env.http_proxy || null;

  request({ url: codepenUrl + '.html', proxy: proxy }, function(err, res, html) {
    if (!err && res && parseInt(res.statusCode, 10) === 200) {
      html = html || '';

      if (html.indexOf('<!DOCTYPE html>') < 0) {
        html = '<!DOCTYPE html>\n' + html;
      }

      var resources = '    <link href="css/style.css" rel="stylesheet">\n' +
                      '    <script src="js/app.js"></script>\n';

      if (options.isCordovaProject) {
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
    if (!err && res && parseInt(res.statusCode, 10) === 200) {
      css = css || '';

      var cssPath = path.join(wwwPath, 'css');
      if (!fs.existsSync(cssPath)) {
        fs.mkdirSync(cssPath);
      }
      css = css.replace("cursor: url('http://ionicframework.com/img/finger.png'), auto;", '');
      fs.writeFileSync(path.join(cssPath, 'style.css'), css, 'utf8');
    }
    qCSS.resolve();
  });

  request({ url: codepenUrl + '.js', proxy: proxy }, function(err, res, js) {
    if (!err && res && parseInt(res.statusCode, 10) === 200) {
      js = js || '';

      var jsPath = path.join(wwwPath, 'js');
      if (!fs.existsSync(jsPath)) {
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

  try {
    var scripts = html.match(/<script [\s\S]*?<\/script>/gi);
    scripts.forEach(function(scriptElement) {
      if (scriptElement.indexOf('text/ng-template') > -1) {

        var lines = scriptElement.split('\n');
        for (var x = 0; x < lines.length; x += 1) {
          try {
            if (lines[x].substr(0, 6) === '      ') {
              lines[x] = lines[x].substr(6);
            }
          } catch (e) {} // eslint-disable-line no-empty
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
  } catch (e) {} // eslint-disable-line no-empty

  try {

    templates.forEach(function(tmpl) {

      var tmpPath = path.join(targetPath, 'www', path.dirname(tmpl.path));
      if (!fs.existsSync(tmpPath)) {
        fs.mkdirSync(tmpPath);
      }

      tmpPath = path.join(targetPath, 'www', tmpl.path);
      fs.writeFileSync(tmpPath, tmpl.html, 'utf8');

      html = html.replace(tmpl.scriptElement, '');
      html = html.replace(/ {4}\n {4}\n/g, '');
    });

  } catch (e) {} // eslint-disable-line no-empty

  return html;
};


Start.fetchLocalStarter = function(options) {
  var q = Q.defer();

  try {
    shelljs.cd('..');

    var localStarterPath = path.resolve(options.template);

    if (!fs.existsSync(localStarterPath)) {
      Utils.fail('Unable to find local starter template: ' + localStarterPath);
      q.reject();
      return q.promise;
    }

    log.info(chalk.bold('\nCopying files to www from:'), localStarterPath);

    // Move the content of this repo into the www folder
    shelljs.cp('-Rf', path.join(localStarterPath, '*'), path.join(options.targetPath, 'www'));

    q.resolve();
  } catch (e) {
    q.reject(e);
  }

  shelljs.cd(options.targetPath);

  return q.promise;
};


Start.fetchIonicStarter = function(options) {
  var repoName;
  if (options.v2) {
    var starter = V2_STARTERS[options.template];
    if (!starter) {
      throw new Error('No starter template named "' + options.template + '"');
    }
    repoName = starter.repoName;
  } else {

    // Get the starter project repo name:
    repoName = 'ionic-starter-' + options.template;
  }

  // Get the URL for the starter project repo:
  var repoUrl = 'https://github.com/driftyco/' + repoName;

  return Start.fetchGithubStarter(options, repoUrl);
};

Start.mergePackageJson = function(starterPackageJson, targetPath) {
  // Merge
  function mergeDeps(target, source) {
    var deps = source["dependencies"] || {};
    var devDeps = source["devDependencies"] || {};

    for(var k in deps) {
      target["dependencies"][k] = deps[k];
    }
    for(var k in devDeps) {
      target["devDependencies"][k] = devDeps[k];
    }
  }
  if (fs.existsSync(starterPackageJson)) {
    var starterPJ, targetPJ;
    try {
      starterPJ = JSON.parse(fs.readFileSync(starterPackageJson));
      targetPJ = JSON.parse(fs.readFileSync(targetPath + '/package.json'));
      mergeDeps(targetPJ, starterPJ);
      fs.writeFileSync(targetPath + '/package.json', JSON.stringify(targetPJ));
    } catch (e) {
      log.error('package.json parse error: %s', e, {});
    }
  }
}

Start.fetchGithubStarter = function(options, repoUrl) {
  var q = Q.defer();

  // https://github.com/driftyco/ionic-starter-tabs/
  var urlParse = parseUrl(repoUrl);
  var pathSplit = urlParse.pathname.replace(/\//g, ' ').trim().split(' ');
  if (!urlParse.hostname || urlParse.hostname.toLowerCase() !== 'github.com' || pathSplit.length !== 2) {
    log.error('Invalid Github URL: ' + repoUrl);
    log.error('Example of a valid URL: https://github.com/driftyco/ionic-starter-tabs/');
    Utils.fail('');
    q.reject();
    return q.promise;
  }
  var starterRepoName = pathSplit[1];
  var starterBranchName = options.starterBranchName ? options.starterBranchName : 'master';
  var repoFolderName = starterRepoName + '-' + starterBranchName;

  // ensure there's an ending /
  if (repoUrl.substr(repoUrl.length - 1) !== '/') {
    repoUrl += '/';
  }
  repoUrl += 'archive/' + starterBranchName + '.zip';

  Utils.fetchArchive(options.targetPath, repoUrl).then(function() {

    try {
      if (options.v2) {
        shelljs.cp('-R', options.targetPath + '/' + repoFolderName + '/.', options.targetPath);
        Start.mergePackageJson(options.targetPath + '/' + repoFolderName + '/package.json', options.targetPath);
      } else {
        // Move the content of this repo into the www folder
        shelljs.cp('-Rf', options.targetPath + '/' + repoFolderName + '/.', 'www');
      }

      // Clean up start template folder
      shelljs.rm('-rf', options.targetPath + '/' + repoFolderName + '/');

      q.resolve();

    } catch (e) {
      q.reject(e);
    }

  }).catch(function() {
    log.error('Please verify you are using a valid URL or a valid ionic starter.');
    log.error('View available starter templates: `ionic start --list`');
    log.error('More info available at: \nhttp://ionicframework.com/getting-started/\nhttps://github.com/driftyco/ionic-cli');
    return Utils.fail('');
  });

  return q.promise;
};

Start.fetchZipStarter = function fetchZipStarter(options) {
  var q = Q.defer();
  var repoFolderName = 'zipFileDownload';

  log.info('Fetching ZIP from url:', chalk.bold(options.zipFileDownload), 'to: ', options.targetPath);

  Utils.fetchArchive(options.targetPath, options.zipFileDownload)
  .then(function() {

    try {

      // Move the content of this repo into the www folder
      shelljs.cp('-Rf', options.targetPath + '/' + repoFolderName + '/.', '/.');

      // Clean up start template folder
      shelljs.rm('-rf', options.targetPath + '/' + repoFolderName + '/');

      q.resolve();

    } catch (e) {
      q.reject(e);
    }

  }).catch(function(err) {
    log.error(err);
    log.error('Please verify you are using a valid URL or a valid ionic starter.');
    log.error('View available starter templates: `ionic templates`');
    log.error('More info available at: \nhttp://ionicframework.com/getting-started/\nhttps://github.com/driftyco/ionic-cli');

    return Utils.fail('');
  });

  return q.promise;
};

Start.fetchPlnkr = function fetchPlnkr(options) {
  var q = Q.defer();

  var plnkrUrl = options.template.split('?')[0].split('#')[0];

  var plnkrId = null;

  // Given any of these urls - we need to extract the ID
  // http://embed.plnkr.co/dFvL8n/preview
  // http://run.plnkr.co/plunks/dFvL8n/#/tabs/friends
  // http://api.plnkr.co/plunks/dFvL8n

  // http://embed.plnkr.co/BZrnKPlCJt93orQp58H3/preview

  // To download, we want http://api.plnkr.co/plunks/dFvL8n.zip

  if (plnkrUrl[plnkrUrl.length - 1] === '/') {
    plnkrUrl = plnkrUrl.substr(0, plnkrUrl.length - 1);
  }

  var plnkrSplit = plnkrUrl.split('/');

  // api link - need zip on end.
  if (plnkrUrl.indexOf('embed.plnkr.co') !== -1) {
    plnkrId = plnkrSplit[3];
  } else if (plnkrUrl.indexOf('run.plnkr.co') !== -1 || plnkrUrl.indexOf('api.plnkr.co') !== -1) {
    plnkrId = plnkrSplit[plnkrSplit.length - 1];

    if (plnkrId.indexOf('.zip') !== -1) {
      plnkrId = plnkrId.replace('.zip', '');
    }
  }

  plnkrUrl = ['http://api.plnkr.co/plunks/', plnkrId, '.zip'].join('');

  log.info('\nDownloading Plnkr url:', plnkrUrl);

  var extractPath = path.join(options.targetPath, 'plnkr');

  Utils.fetchArchive(extractPath, plnkrUrl)
  .then(function() {
    try {

      // Move the content of this repo into the www folder
      var copyDir = [extractPath, '/*'].join('');
      shelljs.cp('-Rf', copyDir, 'www');

      // Clean up start template folder
      shelljs.rm('-rf', extractPath + '/');
      q.resolve();

    } catch (e) {
      q.reject(e);
    }
  });

  return q.promise;
};

// New initCordova method intended for GUI - to use cordova-lib commands instead of CLI.
Start.initCordovaFromGui = function initCordovaFromGui(options, appSetup) {
  var q = Q.defer();

  //log.debug('Initializing Cordova for Gui');

  try {
    if (options.isCordovaProject) {
      Hooks.setHooksPermission(options.targetPath);
      log.info('Update Config.xml');
      appSetup.bower = appSetup.bower ? appSetup.bower : [];
      var promises = [];

      // // add plugins
      for (var x = 0; x < appSetup.plugins.length; x += 1) {
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

      //log.info('Initializing cordova project');

      Q.all(promises)
      .then(function() {
        q.resolve();
      })
      .catch(function(ex) {
        q.reject(ex);
        throw ex;
      });
      q.resolve();

    } else {
      q.resolve();
    }
  } catch (ex) {
    log.debug('Exception caught in initCordova: %s', ex, {});
    log.debug('Exception details: %s', ex.stack, {});
    q.reject(ex);
  }

  return q.promise;
};

Start.initCordovaNoCli = function initCordova(options, appSetup) {
  try {

    // console.log('running initCordovaNoCli');
    var promises = [];

    // add plugins
    for (var x = 0; x < appSetup.plugins.length; x += 1) {
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

    //log.info('Initializing cordova project without CLI');
    return Q.all(promises);

  } catch (ex) {
    Utils.fail(ex);
  }
};

Start.initCordova = function(options, appSetup) {
  if (!options.isCordovaProject) {
    log.info('not a cordova project, no cordova options to initialize');
    return Q.resolve();
  }

  Hooks.setHooksPermission(options.targetPath);

  //log.info('\nAdding initial native plugins');

  appSetup.bower = appSetup.bower ? appSetup.bower : [];

  return Utils.cordovaInstalled().then(function(isCordovaInstalled) {
    if (isCordovaInstalled) {
      return Start.initCordovaNoCli(options, appSetup);
    }
    return rInitCordova(options, appSetup);
  });
};

function rInitCordova(options, appSetup) {
  var q = Q.defer();

  try {
    var cmds = [];

    // add plugins
    for (var x = 0; x < appSetup.plugins.length; x += 1) {
      cmds.push('cordova plugin add --save ' + appSetup.plugins[x]);
    }

    if (appSetup.bower) {

      // add bower packages
      for (var y = 0; y < appSetup.bower.length; y += 1) {
        cmds.push('ionic add ' + appSetup.bower[y]);
      }
    }

    // platform add android with --android flag
    if (options.android) {
      cmds.push('ionic platform add android');
    }

    // platform add ios with --android flag
    if (options.ios) {
      cmds.push('ionic platform add ios');
    }

    // 30 ticks
    // 7 plugins
    // 2 seconds per plugin
    // total time: 7 * 2 = 14seconds
    // Need to get through 30 ticks in 14000 ms, so
    // 14000 / 30
    var bar = new ProgressBar('[:bar]  :percent  :etas', { total: 30, complete: '=', incomplete: ' ' });
    var timer = setInterval(function() {
      bar.tick();
      if (bar.complete) {
        clearInterval(timer);
      }
    }, (cmds.length * 3000) / 30);


    require('child_process').exec(cmds.join(' && '),
      function(err, stdout, stderr) {
        bar.tick(30);
        if (err) {
          log.error(err, stderr);
          Utils.fail('Unable to add plugins. Perhaps your version of Cordova is too old. ' +
                     'Try updating (npm install -g cordova), removing this project folder, and trying again:', stderr);
          q.reject(stderr);
        } else {
          q.resolve(stdout);
        }
      });

    // Start.updateConfigXml(options.targetPath, options.packageName, options.appName, options.ios, options.android);
  } catch (ex) {
    log.debug('Exception caught in initCordova: %s', ex, {});
    log.debug('Exception details: %s', ex.stack, {});
    q.reject(ex);
  }

  return q.promise;
}

Start.updateConfigXml = function(targetPath, packageName, appName) {
  var q = Q.defer();

  try {

    var configXmlPath = targetPath + '/config.xml';
    var configString = fs.readFileSync(configXmlPath, { encoding: 'utf-8' });

    var parseString = xml2js.parseString;
    parseString(configString, function(err, jsonConfig) {
      if (err) {
        Utils.fail('Error parsing config.xml: ' + err);
      }

      if (!packageName) {
        var directoryName = path.basename(targetPath);
        packageName = directoryName + (directoryName !== 'tmp' ? Math.round((Math.random() * 899999) + 100000) : '');
        packageName = 'com.ionicframework.' + packageName.replace(/\./g, '');
      }

      jsonConfig.widget.$.id = packageName
        .replace(/ /g, '')
        .replace(/-/g, '')
        .replace(/_/g, '')
        .toLowerCase()
        .trim();
      jsonConfig.widget.name = [appName];

      var xmlBuilder = new xml2js.Builder();
      configString = xmlBuilder.buildObject(jsonConfig);

      fs.writeFile(configXmlPath, configString, 'utf8', function(err) {
        if (err) {
          Utils.fail('Error saving config.xml file: ' + err);
        } else {
          q.resolve();
        }
      });
    });

  } catch (e) {

    // return self.ionic.fail('Error updating config.xml file: ' + e);
    log.error('Error updating config.xml file: %s', e.stack);
  }

  return q.promise;
};


Start.updateLibFiles = function(libPath) {

  // create a symlink if the path exists locally
  var libSymlinkPath = path.resolve(libPath);
  if (fs.existsSync(libSymlinkPath)) {

    // rename the existing lib/ionic directory before creating symlink
    var wwwIonicCssPath = path.resolve('www/lib/ionic/css');
    if (fs.existsSync(wwwIonicCssPath)) {
      shelljs.mv(wwwIonicCssPath, path.resolve('www/lib/ionic/css_local'));
    }

    var wwwIonicJsPath = path.resolve('www/lib/ionic/js');
    if (fs.existsSync(wwwIonicJsPath)) {
      shelljs.mv(wwwIonicJsPath, path.resolve('www/lib/ionic/js_local'));
    }

    var wwwIonicFontsPath = path.resolve('www/lib/ionic/fonts');
    if (fs.existsSync(wwwIonicFontsPath)) {
      shelljs.mv(wwwIonicFontsPath, path.resolve('www/lib/ionic/fonts_local'));
    }

    var libCssSymlinkPath = path.join(libSymlinkPath, 'css');
    log.info('Create www/lib/ionic/css symlink to ' + libCssSymlinkPath);
    fs.symlinkSync(libCssSymlinkPath, wwwIonicCssPath);

    var libJsSymlinkPath = path.join(libSymlinkPath, 'js');
    log.info('Create www/lib/ionic/js symlink to ' + libJsSymlinkPath);
    fs.symlinkSync(libJsSymlinkPath, wwwIonicJsPath);

    var libFontsSymlinkPath = path.join(libSymlinkPath, 'fonts');
    log.info('Create www/lib/ionic/fonts symlink to ' + libFontsSymlinkPath);
    fs.symlinkSync(libFontsSymlinkPath, wwwIonicFontsPath);

    libPath = 'lib/ionic';
  }

  if (libPath === 'lib/ionic' && (seedType === 'ionic-starter' || /ionic-starter/i.test(this.template))) {

    // don't bother if its still is the default which comes with the starters
    return;
  }

  // path did not exist locally, so manually switch out the path in the html
  var libFiles = [
    'ionic.css',
    'ionic.min.css',
    'ionic.js',
    'ionic.min.js',
    'ionic.bundle.js',
    'ionic.bundle.min.js',
    'ionic-angular.js',
    'ionic-angular.min.js'
  ];

  function isLibFile(tag) {
    if (tag) {
      tag = tag.toLowerCase();
      for (var x = 0; x < libFiles.length; x += 1) {
        if (tag.indexOf(libFiles[x]) > -1) {
          return true;
        }
      }
    }
  }

  function changeLibPath(originalUrl) {
    var splt = originalUrl.split('/');
    var newUrl = [libPath];
    var filename = splt[splt.length - 1];

    if (filename.indexOf('.css') > -1) {
      newUrl.push('css');
    } else if (filename.indexOf('.js') > -1) {
      newUrl.push('js');
    }

    newUrl.push(filename);

    return newUrl.join('/');
  }

  function replaceResource(html, originalTag) {
    originalTag = originalTag.replace(/'/g, '"');
    var splt = originalTag.split('"');
    var newTagArray = [];

    for (var x = 0; x < splt.length; x += 1) {
      if (isLibFile(splt[x])) {
        newTagArray.push(changeLibPath(splt[x]));
      } else {
        newTagArray.push(splt[x]);
      }
    }

    var newTag = newTagArray.join('"');

    return html.replace(originalTag, newTag);
  }

  function getLibTags(html) {
    var resourceTags = [];
    var libTags = [];

    try {
      resourceTags = resourceTags.concat(html.match(/<script (.*?)>/gi));
    } catch (e) {} // eslint-disable-line no-empty

    try {
      resourceTags = resourceTags.concat(html.match(/<link (.*?)>/gi));
    } catch (e) {} // eslint-disable-line no-empty

    for (var x = 0; x < resourceTags.length; x += 1) {
      if (isLibFile(resourceTags[x])) {
        libTags.push(resourceTags[x]);
      }
    }

    return libTags;
  }

  try {
    log.info('Replacing Ionic lib references with ' + libPath);
    var indexPath = path.join(this.targetPath, 'www', 'index.html');
    var html = fs.readFileSync(indexPath, 'utf8');

    var libTags = getLibTags(html);

    for (var x = 0; x < libTags.length; x += 1) {
      var originalTag = libTags[x];

      html = replaceResource(html, originalTag);
    }

    fs.writeFileSync(indexPath, html, 'utf8');

  } catch (e) {} // eslint-disable-line no-empty
};

Start.promptLogin = function() {
  var q = Q.defer();

  var ionicConfig = new IonicStore('ionic.config');
  if (ionicConfig) {

    // Check if we already asked
    var didPrompt = ionicConfig.get('accountPrompt');
    if (didPrompt === 'y') {
      return;
    }
    ionicConfig.set('accountPrompt', 'y');
    ionicConfig.save();
  }

  log.info('\nCreate a free Ionic account to share and test apps with Ionic View?');

  var promptProperties = {
    shouldCreate: {
      name: 'shouldCreate',
      description: chalk.yellow.bold('(Y/n):')
    }
  };

  prompt.override = argv;
  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  prompt.get({ properties: promptProperties }, function(err, promptResult) {
    if (err) {
      q.reject(err);
      return log.error(err);
    }

    var areYouSure = promptResult.shouldCreate.toLowerCase().trim();
    if (areYouSure.toLowerCase() !== 'n') {

      // If they want to, let's open a thing
      open(IONIC_DASH + '/signup');
      q.resolve(true);
      return;
    }

    // They didnt want to set up account.
    q.resolve(false);
  });

  return q.promise;
};

Start.finalize = function(options) {
  try {
    var packageFilePath = path.join(options.targetPath, 'package.json');
    var packageData = require(packageFilePath);
    packageData.name = encodeURIComponent(options.appName.toLowerCase().replace(/\s+/g, '-'));

    // v2 projects should all be named the same in
    // order to point to the npm package for errors
    if (options.v2) {
      packageData.name = 'ionic-hello-world';
    }

    packageData.description = options.appName + ': An Ionic project';
    fs.writeFileSync(packageFilePath, JSON.stringify(packageData, null, 2), 'utf8');
  } catch (e) {
    log.error('There was an error finalizing the package.json file. %s', e, {});
  }

  try {

    // create the ionic.project file and
    // set the app name
    var project = IonicProject.create(options.targetPath, options.appName);
    project.set('name', options.appName);

    if (options.ionicAppId) {
      project.set('app_id', options.ionicAppId);
    }

    if (options.v2) {
      project.set('v2', true);
      project.set('typescript', true);
    }

    project.save(options.targetPath);
    log.debug('Saved project file');
  } catch (e) {
    log.error('Error saving project file');
  }

  try {

    // update the app name in the bower.json file
    var ionicBower = require('./bower').IonicBower;
    ionicBower.setAppName(options.appName);
  } catch (e) {} // eslint-disable-line no-empty

  try {

    // remove the README file in the root because it
    // doesn't make sense because its the README for the repo
    // and not helper text while developing an app
    fs.unlinkSync(options.targetPath + '/README.md');
  } catch (e) {} // eslint-disable-line no-empty

  try {

    // remove the README file in the www root because it
    // doesn't make sense because its the README for the repo
    // and not helper text while developing an app
    fs.unlinkSync(options.targetPath + '/www/README.md');
  } catch (e) {} // eslint-disable-line no-empty

  if (options.isCordovaProject) {
    State.saveState(process.cwd(), { plugins: true });
  }

  // Start.printQuickHelp();

  // Start.ionic.printNewsUpdates(true).then(function() {
    // self.promptLogin();
  // });

};

Start.printQuickHelp = function() {
  log.info(chalk.bold('\n♬ ♫ ♬ ♫  Your Ionic app is ready to go! ♬ ♫ ♬ ♫'));
  log.info(chalk.bold('\nSome helpful tips:'));
  log.info(chalk.bold('\nRun your app in the browser (great for initial development):'));
  log.info('  ionic serve');
  log.info(chalk.bold('\nRun on a device or simulator:'));
  log.info('  ionic run ios[android,browser]');
  log.info(chalk.bold('\nShare your app with testers, and test on device easily with the Ionic View companion app:'));
  log.info('  http://view.ionic.io');
};

Start.promptForOverwrite = function promptForOverwrite(targetPath) {
  var q = Q.defer();
  log.warn('Directory already exists:', chalk.cyan(targetPath));
  log.info('Would you like to overwrite the directory with this new project?');
  var promptProperties = {
    areYouSure: {
      name: 'areYouSure',
      description: '(yes/no):',
      required: true
    }
  };

  prompt.colors = false;
  prompt.override = argv;
  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  prompt.get({ properties: promptProperties }, function(err, promptResult) {
    if (err && err.message !== 'canceled') {
      q.reject(err);
      return log.error(err);
    } else if (err && err.message === 'canceled') {
      return q.resolve(false);
    }

    var areYouSure = promptResult.areYouSure.toLowerCase().trim();
    if (areYouSure === 'yes' || areYouSure === 'y') {
      shelljs.rm('-rf', targetPath);

      // Empty line
      log.info('');
      q.resolve(true);
    } else {
      q.resolve(false);
    }
  });

  return q.promise;
};
