var Q = require('q'),
    events = require('../lib/events'),
    helpers = require('./helpers')
    Project = require('../lib/project'),
    rewire = require('rewire'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

var defaultServeOptions = {
  address: '0.0.0.0',
  appDirectory: '/ionic/app',
  browser: undefined,
  browserOption: '',
  contentSrc: 'www/index.html',
  createDocumentRoot: null,
  defaultBrowser: undefined,
  documentRoot: 'www',
  gulpStartupTasks: undefined,
  gulpDependantTasks: undefined,
  isAddressCmd: false,
  launchBrowser: true,
  launchLab: undefined,
  liveReloadPort: 35729,
  port: 8100,
  printConsoleLogs: undefined,
  printServerLogs: undefined,
  proxies: [],
  runLivereload: true,
  useProxy: false,
  watchPatterns: [ 'www/**/*', '!www/lib/**/*' ],
  watchSass: false,
};

var serveArgs = { _: [ 'serve' ], '$0': '/usr/local/bin/ionic' };

function compareOptions(options) {
  // console.log('CHECKING OPTIONS');
  // console.log(options);
  expect(options.browser).toBe(defaultServeOptions.browser);
  expect(options.browserOption).toBe(defaultServeOptions.browserOption);
  expect(options.contentSrc).toBe(defaultServeOptions.contentSrc);
  expect(options.createDocumentRoot).toBe(defaultServeOptions.createDocumentRoot);
  expect(options.defaultBrowser).toBe(defaultServeOptions.defaultBrowser);
  expect(options.documentRoot).toBe(defaultServeOptions.documentRoot);
  expect(options.gulpStartupTasks).toBe(defaultServeOptions.gulpStartupTasks);
  expect(options.gulpDependantTasks).toBe(defaultServeOptions.gulpDependantTasks);
  expect(options.isAddressCmd).toBe(defaultServeOptions.isAddressCmd);
  expect(options.launchBrowser).toBe(defaultServeOptions.launchBrowser);
  expect(options.launchLab).toBe(defaultServeOptions.launchLab);
  expect(options.liveReloadPort).toBe(defaultServeOptions.liveReloadPort);
  expect(options.port).toBe(defaultServeOptions.port);
  expect(options.printConsoleLogs).toBe(defaultServeOptions.printConsoleLogs);
  expect(options.printServerLogs).toBe(defaultServeOptions.printServerLogs);
  expect(options.proxies.length).toBe(defaultServeOptions.proxies.length);
  expect(options.runLivereload).toBe(defaultServeOptions.runLivereload);
  expect(options.useProxy).toBe(defaultServeOptions.useProxy);
  expect(options.watchPatterns.length).toBe(defaultServeOptions.watchPatterns.length);
  expect(options.watchSass).toBe(defaultServeOptions.watchSass);
}

describe('Serve', function() {
  var Serve;

  beforeEach(function() {
    Serve = rewire('../lib/serve');
    serveArgs = { _: [ 'serve' ], '$0': '/usr/local/bin/ionic' };
  });

  it('should have serve defined', function() {
    expect(Serve).toBeDefined();
  });

  it('should have start command require options', function() {
    expect(function() {
      Serve.start(null);
    }).toThrow('You cannot serve without options.');
  });

  it('should call check for document root', function() {
    var checkSpy = spyOn(Serve, 'checkForDocumentRoot');
    Serve.start(defaultServeOptions);
    expect(Serve.checkForDocumentRoot).toHaveBeenCalledWith(defaultServeOptions);
  });

  describe('#loadSettings', function (){
    var project;
    beforeEach(function() {
      project = Project.wrap('/ionic/project', Project.PROJECT_DEFAULT);
    });

    it('should parse out options from arg hash', function() {
      try {
        var options = Serve.loadSettings(serveArgs, project);
        compareOptions(options);
      } catch(ex) {
        console.log(ex);
      }
    });

    it('should have runLivereload to be set to false when flag passed', function() {
      serveArgs.nolivereload = true;
      var options = Serve.loadSettings(serveArgs, project);
      expect(options.runLivereload).toBe(false);
    });
  });

  describe('#runLivereload', function() {
    it('should run environment live reload port over options livereload port', function(done) {
      
      var vfsSpy = createSpyObj('vfs', ['watch']);
      Serve.__set__('vfs', vfsSpy);

      var lrServerSpy = createSpy('lrServer');
      lrServerSpy.listen = function(){}; //hack to add spy
      spyOn(lrServerSpy, 'listen').andCallFake(function(port, cb) {
        cb();
      })
      var tinylrSpy = createSpy('tinylr').andReturn(lrServerSpy);
      
      Serve.__set__('tinylr', tinylrSpy);
      var lrSpy = createSpy('lr').andReturn({});
      var th = Serve.__set__('lr', lrSpy);
      // console.log('th', th);
      // Serve.__set__('connect-livereload', lrSpy);

      process.env.CONNECT_LIVE_RELOAD_PORT = 15000;
      var app = createSpyObj('app', ['use']);
      Q()
      .then(function(){
        return Serve.runLivereload(defaultServeOptions, app);
      })
      .then(function() {
        var listenArgs = lrServerSpy.listen.argsForCall[0];
        // console.log(listenArgs)
        expect(listenArgs[0]).toBe('15000');

        expect(lrSpy).toHaveBeenCalledWith({port: '15000'});
        expect(app.use).toHaveBeenCalledWith({});
      })
      .catch(function(ex){
        expect('this').toBe(ex.stack);
      })
      .fin(done);
    });
  });

});
