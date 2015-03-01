var fs = require('fs'),
    os = require('os'),
    request = require('request'),
    ncp = require('ncp').ncp,
    path = require('path'),
    parseUrl = require('url').parse,
    shelljs = require('shelljs/global'),
    shellConfig = require('shelljs').config,
    argv = require('optimist').boolean(['no-cordova', 'sass', 'list']).argv,
    prompt = require('prompt'),
    colors = require('colors'),
    Q = require('q'),
    open = require('open'),
    xml2js = require('xml2js'),
    IonicProject = require('./project'),
    IonicTemplates = require('./templates').IonicTask,
    IonicStore = require('./store').IonicStore,
    Task = require('./task').Task;
    IonicStats = require('./stats').IonicStats,
    utils = require('./utils'),
    events = require('./events');

var seedType = 'ionic-starter';
var Start = module.exports;
shellConfig.silent = true;

var IonicTask = function() {};

// The URL for the cordova wrapper project
IonicTask.WRAPPER_REPO_NAME = 'ionic-app-base';

IonicTask.DEFAULT_APP = {
  "plugins": [
    "org.apache.cordova.device",
    "org.apache.cordova.console",
    "com.ionic.keyboard"
  ],
  "sass": false
};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  this.ionic = ionic;
  var self = this;

  console.log('args ', argv._)

  if(argv.list || argv.l) {
    new IonicTemplates().run(ionic);
    return;
  }

  if(argv._.length < 2) {
    return this.ionic.fail('Invalid command', 'start');
  }

  if(argv._[1] == '.') {
    console.log('Please name your Ionic project something meaningful other than \'.\''.red);
    return
  }

  // Grab the app's relative directory name
  this.appDirectory = argv._[1];

  // Grab the name of the app from -a or  --app. Defaults to appDirectory if none provided
  this.appName = argv.appname || argv['app-name'] || argv.a;
  if(!this.appName) {
    var appNameSplit = this.appDirectory.split('/');
    appNameSplit = appNameSplit[ appNameSplit.length -1 ].split('\\');
    this.appName = appNameSplit[ appNameSplit.length -1 ];
  }

  // get a packge name, like com.ionic.myapp
  this.packageName = argv.id || argv.i;
  this.isCordovaProject = (argv.cordova !== false && !argv.w);

  // start project template can come from cmd line args -t, --template, or the 3rd arg, and defaults to tabs
  this.template = (argv.template || argv.t || argv._[2] || 'tabs');

  // figure out the full path
  this.targetPath = path.resolve(this.appDirectory);

  console.log('Creating Ionic app in folder', this.targetPath, 'based on', this.template.bold, 'project');

  // Make sure to create this
  if( fs.existsSync(this.targetPath) ) {
    // prompt for log
    console.log('\nThe directory'.error.bold, this.targetPath, 'already exists.'.error.bold);
    console.log('Would you like to overwrite the directory with this new project?');

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
      if(err) {
        return console.log(err);
      }

      var areYouSure = promptResult.areYouSure.toLowerCase().trim();
      if(areYouSure == 'yes' || areYouSure == 'y') {
        rm('-rf', self.targetPath);
        Start.startApp();
      }
    });

  } else {
    // create the app directory
    fs.mkdirSync(this.targetPath);
    this.startApp();
  }

};

// Start.start = function start(targetPath, packageName, appName, isCordovaProject, setupSass) {
//   if(targetPath == '.') {
//     throw new Error('Invalid target path, you may not specify \'.\' as an app name');
//   }

//   // console.log('in start, with startApp:', Start.startApp)

//   Start.startApp(targetPath, packageName, appName, isCordovaProject, setupSass);
// }

// This is a stand in for the current run method.
Start.startApp = function startApp(options) {
  // console.log('StartApp is going from cli-lib')

  if(typeof options != 'object' || typeof options =='undefined') {
    throw new Error('You cannot start an app without options');
  }

  // options = {
  //   appName,
  //   targetPath, 
  //   template, 
  //   packageName, 
  //   appName, 
  //   isCordovaProject, 
  //   setupSass
  // }

  options = utils.preprocessOptions(options);

  if(typeof options.targetPath == 'undefined' || options.targetPath == '.') {
    throw new Error('Invalid target path, you may not specify \'.\' as an app name');
  }

  return Start.fetchWrapper(options)
  .then(function(data){
    // events.emit('log', 'FetchWrapper done')
    return Start.fetchSeed(options);
  })
  .then(function(){
    // events.emit('log', 'finished fetchSeed', options)
    return Start.loadAppSetup(options);
  })
  .then(function(appSetup){
    // console.log('finished loadAppSetup - ', appSetup)
    return Start.initCordova(options, appSetup);
  })
  .then(function(){
    // console.log('finished initCordova')
    return Start.setupSass(options);
  })
  .then(function(){
    // console.log('finished setupSass')
    return Start.finalize(options);
  })
  .catch(function(err) {
    console.log('Error Initializing app: ', err.stack);
    // events.emit('log', ['Error: Unable to initalize app:', err.stack].join(' '));
    // return self.ionic.fail('');
    // q.reject('Error: Unable to initalize app:' + err)
    throw new Error('Unable to initalize app:')
  })
  .fin(function(){
    // q.resolve('Completed successfully')
    // console.log('fin the chain')
    return 'Completed successfully';
  })
};


Start.fetchWrapper = function fetchWrapper(options) {
  var q = Q.defer();
  // var self = this;

  var repoUrl = 'https://github.com/driftyco/' + IonicTask.WRAPPER_REPO_NAME + '/archive/master.zip';

  utils.fetchArchive(options.targetPath, repoUrl)
  .then(function() {
    var repoFolderName = IonicTask.WRAPPER_REPO_NAME + '-master';
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
  // console.log('fetchSeed options:', options)
  // Codepen: http://codepen.io/ionic/pen/GpCst
  if( /\/\/codepen.io\//i.test(options.template) ) {
    seedType = 'codepen';
    return Start.fetchCodepen(options);
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

  // Local Directory: /User/starterapp
  if( (options.template.indexOf('/') > -1 || options.template.indexOf('\\') > -1) && (options.template.indexOf('http://') === -1 && options.template.indexOf('https://') === -1)) {
    // console.log('local', options.template);
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
  var appSetup = IonicTask.DEFAULT_APP;

  var appJsonPath = path.join(options.targetPath, 'www', 'app.json');

  if(fs.existsSync(appJsonPath)) {
    try {
      appSetup = JSON.parse( fs.readFileSync(appJsonPath) );
      rm('-rf', appJsonPath);
    } catch(e) {
      console.log( 'app.json error:', e);
    }
  }

  return appSetup;
};

//Not Tested
Start.fetchCreatorApp = function(options) {
  // var self = this;
  var appId = options.template.split(':')[1];
  var downloadUrl = Ionic.IONIC_DASH + path.join('/api/v1/creator', appId, 'download/html');
  var wwwPath = path.join(options.targetPath, 'www');

  console.log('\nDownloading Creator Prototype:'.bold, downloadUrl);

  var q = Q.defer();

  var proxy = process.env.PROXY || null;

  request({ url: downloadUrl, proxy: proxy }, function(err, res, html) {
    if(!err && res && res.statusCode === 200) {
      //html = self.convertTemplates(html);

      fs.writeFileSync(path.join(wwwPath, 'index.html'), html, 'utf8');
    } else {
      // events.emit('log', ['Unable to fetch', err, res.statusCode].join(' '));
      q.reject(res);
    }
    q.resolve();
  });
  return Q.all([q]);
};

Start.fetchCodepen = function(options) {
  // var self = this;
  var codepenUrl = options.template.split('?')[0].split('#')[0];
  var wwwPath = path.join(options.targetPath, 'www');

  // events.emit('log', 'Downloading Codepen: ' + codepenUrl);

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

      if(isCordovaProject) {
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

    console.log('\nCopying files to www from:'.bold, localStarterPath);

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
    events.emit('log', ('Invalid Github URL: ' + repoUrl).error );
    events.emit('log', ('Example of a valid URL: https://github.com/driftyco/ionic-starter-tabs/').error );
    utils.fail('');
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

  utils.fetchArchive(options.targetPath, repoUrl).then(function() {

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
    events.emit('log', 'More info available at: \nhttp://ionicframework.com/getting-started/\nhttps://github.com/driftyco/ionic-cli');
    return utils.fail('');
  });

  return q.promise;
};


    // return Start.initCordova(targetPath, packageName, appName, isCordovaProject, appSetup);

Start.initCordova = function(options, appSetup) {
  // var self = this;
  // console.log('Init cordova: ', options.isCordovaProject, options.appSetup, options.ios)
  var q = Q.defer();

  if(options.isCordovaProject) {
    // update the config.xml file from cmd line args
// Start.updateConfigXml = function(targetPath, packageName, appName, appDirectory) {

    Start.updateConfigXml(options.targetPath, options.packageName, options.appName);

    // if(this.ionic.hasFailed) return;

    var cmds = [];

    // add plugins
    for(var x=0; x<appSetup.plugins.length; x++) {
      cmds.push('cordova plugin add ' + appSetup.plugins[x]);
    }

    // platform add android with --android flag
    if(options.android) {
      cmds.push('cordova platform add android');
    }

    // platform add ios with --android flag
    if(options.ios) {
      cmds.push('cordova platform add ios');
    }

    // console.log('About to run exec on cmds:', cmds)

    events.emit('log', 'Initializing cordova project');
    exec(cmds.join(' && '),
         function(err, stdout, stderr) {
            if(err) {
              // self.ionic.fail('Unable to add plugins. Perhaps your version of Cordova is too old. ' +
                              // 'Try updating (npm install -g cordova), removing this project folder, and trying again.');
              q.reject(stderr);
            } else {
              q.resolve(stdout);
            }
    });

  } else {
    q.resolve();
  }

  return q.promise;
};


Start.updateConfigXml = function(targetPath, packageName, appName, ios, android) {
  // var self = this;
  // console.log('updateConfigXml config.xml');

  try {
    var configXmlPath = targetPath + '/config.xml';
    var configString = fs.readFileSync(configXmlPath, { encoding: 'utf8' });

    var parseString = xml2js.parseString;
    parseString(configString, function (err, jsonConfig) {
      if(err) {
        return self.ionic.fail('Error parsing config.xml: ' + err);
      }

      if(!packageName) {
        packageName = targetPath + (targetPath !== 'tmp' ? Math.round((Math.random() * 899999) + 100000) : '');
        packageName = 'com.ionicframework.' + packageName.replace(/\./g, '');
      }

      jsonConfig.widget.$.id = packageName.replace(/ /g, '').replace(/-/g, '').replace(/_/g, '').toLowerCase().trim();
      jsonConfig.widget.name = [ appName ];

      var xmlBuilder = new xml2js.Builder();
      configString = xmlBuilder.buildObject(jsonConfig);

      fs.writeFile(configXmlPath, configString, function(err) {
        if(err) {
          return self.ionic.fail('Error saving config.xml file: ' + err);
        }
      });
    });

  } catch(e) {
    // return self.ionic.fail('Error updating config.xml file: ' + e);
    console.log('Error updating config.xml file: ' + e)
    return
  }
};


Start.setupSass = function(options) {
  if(options.setupSass) {
    // auto setup sass if they set the option
    // events.emit('log', 'setup sass');
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
  console.log('updateLibFiles:', libPath)

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
    console.log('Create www/lib/ionic/css symlink to ' + libCssSymlinkPath);
    fs.symlinkSync(libCssSymlinkPath, wwwIonicCssPath);

    var libJsSymlinkPath = path.join(libSymlinkPath, 'js');
    console.log('Create www/lib/ionic/js symlink to ' + libJsSymlinkPath);
    fs.symlinkSync(libJsSymlinkPath, wwwIonicJsPath);

    var libFontsSymlinkPath = path.join(libSymlinkPath, 'fonts');
    console.log('Create www/lib/ionic/fonts symlink to ' + libFontsSymlinkPath);
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
    console.log('Replacing Ionic lib references with ' + libPath);
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

IonicTask.prototype.promptLogin = function() {
  var ionicConfig = new IonicStore('ionic.config');

  if(ionicConfig) {
    // Check if we already asked
    var didPrompt = ionicConfig.get('accountPrompt');
    if(didPrompt == 'y') {
      /*
      console.log('\n' + 'New!'.green.bold + ' Create an ionic.io account and try the View App!\n' + Ionic.IONIC_DASH + '/signup');
      */
      return;
    }
    ionicConfig.set('accountPrompt', 'y');
    ionicConfig.save();
  }

  console.log('\nCreate an ionic.io account to use the Ionic View app and other features?');


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
      return console.log(err);
    }

    var areYouSure = promptResult.shouldCreate.toLowerCase().trim();
    if(areYouSure.toLowerCase() != 'n') {
      // If they want to, let's open a thing
      open(Ionic.IONIC_DASH + '/signup');
    }
  });
};

Start.finalize = function(options) {
  Start.updateLibFiles(options.targetPath);

  try {
    var packageFilePath = path.resolve('package.json');
    var packageData = require(packageFilePath);
    packageData.name = encodeURIComponent( options.appName.toLowerCase().replace(/\s+/g, '-') );
    packageData.description = options.appName + ': An Ionic project';
    fs.writeFileSync(packageFilePath, JSON.stringify(packageData, null, 2), 'utf8');
  } catch(e) {}

  try {
    // create the ionic.project file and
    // set the app name
    var project = IonicProject.create();
    project.set('name', options.appName);
    project.save(options.targetPath);
  } catch(e) {}

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

  IonicStats.t();

};


IonicTask.prototype.printQuickHelp = function() {
  console.log('\nYour Ionic project is ready to go!'.green.bold, 'Some quick tips:');

  console.log('\n * cd into your project:', ('$ cd ' + this.appDirectory).bold);

  if(!this.hasSass) {
    console.log('\n * Setup this project to use Sass:', 'ionic setup sass'.bold);
  }

  console.log('\n * Develop in the browser with live reload:', 'ionic serve'.bold);

  if(this.isCordovaProject) {
    console.log('\n * Add a platform (ios or Android):', 'ionic platform add ios [android]'.bold);
    console.log('   Note: iOS development requires OS X currently'.small);
    console.log('   See the Android Platform Guide for full Android installation instructions:'.small);
    console.log('   https://cordova.apache.org/docs/en/edge/guide_platforms_android_index.md.html'.small);
    console.log('\n * Build your app:', 'ionic build <PLATFORM>'.bold);
    console.log('\n * Simulate your app:', 'ionic emulate <PLATFORM>'.bold);
    console.log('\n * Run your app on a device:', 'ionic run <PLATFORM>'.bold);
    console.log('\n * Package an app using Ionic package service:', 'ionic package <MODE> <PLATFORM>'.bold);
  }
  console.log('\nFor more help use', 'ionic --help'.bold, 'or visit the Ionic docs:', 'http://ionicframework.com/docs\n'.bold);
};


// module.exports = {
//   IonicTask: IonicTask,
//   fetchWrapper: fetchWrapper
// }
// Start.startApp = startApp;
