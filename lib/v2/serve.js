var fs = require('fs'),
    Q = require('q'),
    path = require('path'),
    colors = require('colors'),
    connect = require('connect'),
    finalhandler = require('finalhandler'),
    http = require('http'),
    serveStatic = require('serve-static'),
    tinylr = require('tiny-lr-fork'),
    lr = require('connect-livereload'),
    vfs = require('vinyl-fs'),
    request = require('request'),
    IonicProject = require('./project'),
    Task = require('../task').Task,
    proxyMiddleware = require('proxy-middleware'),
    url = require('url'),
    xml2js = require('xml2js'),
    IonicStats = require('../stats').IonicStats,
    Utils = require('../utils'),
    events = require('../events'),
    shelljs = require('shelljs'),
    ports = require('../ports'),
    logging = require('../logging'),
    crossSpawn = require('cross-spawn'),
    Transpile = require('./transpile');

var Serve = Object.create(require('../serve'));
module.exports = Serve;

var lrServer,
    runningServer;

var DEFAULT_HTTP_PORT = 8100;
var DEFAULT_LIVE_RELOAD_PORT = 35729;
var IONIC_LAB_URL = '/ionic-lab';
var IONIC_ANGULAR_URL = '/angular.min.js';

Serve.serve = function serve(options) {
  // logging.logger.info('Serving your Ionic V2 application'.green.bold);
  try {
    logging.logger.debug('Serve options:', options);

    // options.gulpDependantTasks = ['sass', 'fonts'];

    var app = connect();

    var webpackPromise;

    var watchPatterns = options.sassWatchPatterns.concat(options.htmlWatchPatterns);

    if (!options.nobuild) {
      Transpile.prepareFonts(options.appDirectory, options.fontsOutputPath);
      Transpile.processSass(options.appDirectory, options.sassEntryFile, options.sassIncludePaths, options.sassOutputFile);
      // bundling and sass can happen simultaneously
      // TODO add --nowatch
      webpackPromise = Transpile.compile(options.appDirectory, true, function() { }, options);
    } else {
      webpackPromise = new Q();
    }

    webpackPromise
    .then(function(val) {
      logging.logger.info('\n√ Webpack complete\n'.green.bold);
      logging.logger.info('∆ Starting dev server.\n'.yellow.bold);
      //TODO: update livereload for v2
      options.watchPatterns = null;
      return Serve.runLivereload(options, app);
    })
    .then(function() {
      return Serve.startServer(options, app);
    })
    .then(function(server) {
      logging.logger.info('√ Running live reload server:'.green.bold, options.liveReloadServer);
      if (options.useProxy) {
        return Serve.setupProxy(options, app);
      }
    })
    .then(function() {
      if (!options.nolivereload) {
        logging.logger.info('√ Watching:'.green.bold, watchPatterns);
        vfs.watch(watchPatterns, {}, function(f) {
          console.log('\nFile changed:', f.path);

          var fileType = path.extname(f.path).slice(1);
          switch(fileType) {
            case 'scss':
              Transpile.processSass(options.appDirectory, options.sassEntryFile, options.sassIncludePaths, options.sassOutputFile)
              .then(function(sassOutputFile) {
                Serve._changed(sassOutputFile, options);
              });
              break;
            case 'html':
              Serve._changed(f.path, options); break;
          }

        });
      }
      // if (!options.nogulp) {
      //   return Serve.gulpDependantTasks(options)
      // }
    })
    .then(function() {
      return Serve.openBrowser(options);
    })
    .then(function(bs) {
      // if (!options.nolivereload) {
      //   options.watchSass = true;
      //   options.gulpStartupTasks = ['sass', 'fonts'];
      //   // console.log('do watch command');
      //   return Serve.gulpStartupTasks(options);
      // }
      return Serve.showFinishedServeMessage(options);
    })
    .catch(function(ex) {
      logging.logger.error(ex);
    });

    // require('child_process').execSync('gulp watch', {stdio: 'inherit'});
  } catch (e) {
    logging.logger.error(e);
  }
};
