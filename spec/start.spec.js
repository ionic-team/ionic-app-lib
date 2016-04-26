var cordova = require('../lib/cordova');
var hooks = require('../lib/hooks');
var ioLib = require('../lib/io-config');
var Project = require('../lib/project');
var start = require('../lib/start');
var Q = require('q');
var helpers = require('./helpers');
var logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

// Things to test
// Does it allow invalid vars?
// What if a path doesnt exist?
// Invalid ID?
var dummyPath = '/Users/Test/Development/Ionic';
var dummyPackageName = 'com.ionic.app';
var dummyAppName = 'Ionic App';
var appSetup;

var dummyOptions = {
  targetPath: dummyPath,
  template: 'sidemenu',
  packageName: dummyPackageName,
  appName: dummyAppName,
  isCordovaProject: true
};

describe('Start', function() {

  it('should have methods defined', function() {
    var methods = ['startApp', 'fetchWrapper', 'fetchSeed', 'loadAppSetup', 'fetchCreatorApp',
      'fetchCodepen', 'convertTemplates', 'fetchLocalStarter', 'fetchIonicStarter',
      'fetchGithubStarter', 'initCordova', 'updateConfigXml', 'updateLibFiles', 'finalize'];
    methods.forEach(function(method) {
      expect(start[method]).toBeDefined();
    });
  });

  it('should have fetchWrapper defined', function() {
    expect(start.fetchWrapper).toBeDefined();
  });

  it('should have startApp defined', function() {
    expect(start.startApp).toBeDefined();
  });

  describe('#startApp', function() {
    beforeEach(function() {
      dummyOptions = {
        targetPath: dummyPath,
        template: 'sidemenu',
        packageName: dummyPackageName,
        appName: dummyAppName,
        isCordovaProject: true
      };

      appSetup = {
        plugins: [
          'org.apache.cordova.device',
          'org.apache.cordova.console',
          'ionic-plugin-keyboard'
        ],
        sass: false
      };

      spyOn(start, 'loadAppSetup').andReturn(Q(appSetup));
      spyOn(ioLib, 'warnMissingData');

      var startAppFunctions = ['fetchWrapper', 'fetchSeed', 'runSpawnCommand', 'initCordova',
        'updateConfigXml', 'addDefaultPlatforms', 'finalize'];
      startAppFunctions.forEach(function(func) {
        spyOn(start, func).andReturn(Q());
      });
    });

    it('should fail if no options are passed', function() {
      expect(function() {
        start.startApp();
      }).toThrow('You cannot start an app without options');
    });

    it('should fail if an invalid path is passed', function() {
      expect(function() {
        start.startApp({
          targetPath: '.'
        });
      }).toThrow('Invalid target path, you may not specify \'.\' as an app name');
    });

    it('should call fetchWrapper', function(done) {
      start.startApp(dummyOptions);
      expect(start.fetchWrapper).toHaveBeenCalledWith(dummyOptions);
      done();
    });

    it('should call fetchSeed', function(done) {
      Q()
      .then(function() {
        return start.startApp(dummyOptions);
      })
      .then(function() {
        expect(start.fetchSeed).toHaveBeenCalledWith(dummyOptions);
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should call loadAppSetup', function(done) {
      Q()
      .then(function() {
        return start.startApp(dummyOptions);
      })
      .then(function() {
        expect(start.loadAppSetup).toHaveBeenCalledWith(dummyOptions);
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should call initCordova', function(done) {
      Q()
      .then(function() {
        return start.startApp(dummyOptions);
      })
      .then(function() {
        expect(start.initCordova).toHaveBeenCalledWith(dummyOptions, appSetup);
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should call finalize', function(done) {
      Q()
      .then(function() {
        return start.startApp(dummyOptions);
      })
      .then(function() {
        expect(start.finalize).toHaveBeenCalledWith(dummyOptions);
      })
      .catch(function() {
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  describe('#finalize', function() {
    it('should save a project file', function() {
      var project = Project.wrap(Project.PROJECT_DEFAULT);
      spyOn(Project, 'create').andReturn(project);
      spyOn(project, 'set');
      spyOn(project, 'save');
      start.finalize(dummyOptions);
      expect(Project.create).toHaveBeenCalledWith(dummyOptions.targetPath, dummyOptions.appName);
      expect(project.set).toHaveBeenCalledWith('name', dummyOptions.appName);
      expect(project.save).toHaveBeenCalledWith(dummyOptions.targetPath);
    });

    it('should save app_id when passed in options', function() {
      var project = Project.wrap(Project.PROJECT_DEFAULT);
      dummyOptions.ionicAppId = 'app-id';
      spyOn(Project, 'create').andReturn(project);
      spyOn(project, 'set');
      spyOn(project, 'save');
      start.finalize(dummyOptions);
      expect(Project.create).toHaveBeenCalledWith(dummyOptions.targetPath, dummyOptions.appName);
      expect(project.set).toHaveBeenCalledWith('name', dummyOptions.appName);
      expect(project.set).toHaveBeenCalledWith('app_id', dummyOptions.ionicAppId);
      expect(project.save).toHaveBeenCalledWith(dummyOptions.targetPath);
    });
  });

  describe('#fetchSeed', function() {
    it('should call fetchIonicStart for an Ionic template type', function(done) {
      spyOn(start, 'fetchIonicStarter').andReturn(Q());

      Q()
      .then(function() {
        return start.fetchSeed(dummyOptions);
      })
      .then(function() {
        expect(start.fetchIonicStarter).toHaveBeenCalledWith(dummyOptions);
      })
      .catch(function(data) {
        expect('this').toBe('not this' + data);
      })
      .fin(done);
    });

    it('should call fetchCodepen when codepen URL is passed', function(done) {
      var codepenUrl = 'http://codepen.io/mhartington/pen/eomzw';
      spyOn(start, 'fetchCodepen').andReturn(Q());
      dummyOptions.template = codepenUrl;

      Q()
      .then(function() {
        return start.fetchSeed(dummyOptions);
      })
      .then(function() {
        expect(start.fetchCodepen).toHaveBeenCalledWith(dummyOptions);
      })
      .catch(function(err) {
        expect('this').toBe('not this' + err);
      })
      .fin(done);
    });

    it('should call fetchCreatorApp when a creator url is passed', function(done) {
      var creatorUrl = 'http://app.ionic.io/creator:5010';
      spyOn(start, 'fetchCreatorApp').andReturn();
      dummyOptions.template = creatorUrl;

      Q()
      .then(function() {
        return start.fetchSeed(dummyOptions);
      })
      .then(function() {
        expect(start.fetchCreatorApp).toHaveBeenCalledWith(dummyOptions);
      })
      .catch(function(err) {
        expect('this').toBe('not this' + err);
      })
      .fin(done);
    });

    it('should call fetchGithubStarter when a github url is passed', function(done) {
      var githubUrl = 'http://github.com/driftyco/ionic-unit-test-starter';
      spyOn(start, 'fetchGithubStarter').andReturn();
      dummyOptions.template = githubUrl;

      Q()
      .then(function() {
        return start.fetchSeed(dummyOptions);
      })
      .then(function() {
        expect(start.fetchGithubStarter).toHaveBeenCalledWith(dummyOptions, githubUrl);
      })
      .catch(function(err) {
        expect('this').toBe('not this' + err);
      })
      .fin(done);
    });

    it('should call fetchLocalStarter when a local path is passed', function(done) {
      var localPath = '/Users/Testing/Dev/local-starter';
      spyOn(start, 'fetchLocalStarter').andReturn();
      dummyOptions.template = localPath;

      Q()
      .then(function() {
        return start.fetchSeed(dummyOptions);
      })
      .then(function() {
        expect(start.fetchLocalStarter).toHaveBeenCalledWith(dummyOptions);
      })
      .catch(function(err) {
        expect('this').toBe('not this' + err);
      })
      .fin(done);
    });

    it('should call fetchPlnkr when a plnkr url is passed', function(done) {
      var plnkrUrl = 'http://embed.plnkr.co/dFvL8n/preview';
      spyOn(start, 'fetchPlnkr').andReturn();
      dummyOptions.template = plnkrUrl;

      Q()
      .then(function() {
        return start.fetchSeed(dummyOptions);
      })
      .then(function() {
        expect(start.fetchPlnkr).toHaveBeenCalledWith(dummyOptions);
      })
      .catch(function(err) {
        expect('this').toBe('not this' + err);
      })
      .fin(done);
    });
  });

  describe('#initCordova', function() {
    beforeEach(function() {
      spyOn(hooks, 'setHooksPermission').andReturn();
      spyOn(start, 'updateConfigXml');
      spyOn(cordova, 'addPlugin');
      spyOn(cordova, 'addPlatform');
      appSetup = {
        plugins: [
          'ionic-plugin-keyboard'
        ]
      };
    });

    // it('should add plugins in appSetup.plugins passed', function() {
    //   start.initCordova(dummyOptions, appSetup);
    //   expect(cordova.addPlugin).toHaveBeenCalledWith(dummyOptions.targetPath, 'com.ionic.keyboard', null, true);
    // });

    // it('should add ios when ios option passed', function() {
    //   dummyOptions.ios = true;
    //   dummyOptions.android = false;
    //   start.initCordova(dummyOptions, appSetup);
    //   expect(cordova.addPlatform).toHaveBeenCalledWith(dummyOptions.targetPath, 'ios', true);
    // });

    // it('should add android when android option passed', function() {
    //   dummyOptions.android = true;
    //   dummyOptions.ios = false;
    //   start.initCordova(dummyOptions, appSetup);
    //   expect(cordova.addPlatform).toHaveBeenCalledWith(dummyOptions.targetPath, 'android', true);
    // });
  });
});
