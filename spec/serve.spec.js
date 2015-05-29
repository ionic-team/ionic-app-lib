var Serve = require('../lib/serve'),
    Q = require('q'),
    events = require('../lib/events'),
    helpers = require('./helpers')
    Project = require('../lib/project');

var defaultServeOptions = {
  browser: undefined,
  browserOption: '',
  contentSrc: 'www/index.html',
  createDocumentRoot: null,
  defaultBrowser: undefined,
  documentRoot: 'www',
  gulpStartupTasks: undefined,
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

  beforeEach(function() {
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

  describe('loadSettings', function (){
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

});
