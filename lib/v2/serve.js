var Q = require('q'),
    colors = require('colors'),
    connect = require('connect'),
    vfs = require('vinyl-fs'),
    path = require('path'),
    logging = require('../logging'),
    Build = require('./build');

var Serve = Object.create(require('../serve'));
module.exports = Serve;

Serve.start = function serve(options) {
  try {
    logging.logger.debug('Serve options:', options);

    var app = connect();

    var webpackPromise;

    // TODO this should happen when config is loaded and defaults should be
    // provided
    var watchPatterns;
    try {
      watchPatterns = options.config.paths.watch.livereload;
    } catch(e) {
      logging.logger.info('√ No livereload watch patterns found, using defaults'.green.bold);
      watchPatterns = [
        'www/build/**/*.html',
        'www/build/**/*.js',
        'www/build/**/*.css'
      ];
    }

    if (!options.nobuild) {
      // TODO add --nowatch
      options.watch = true;
      webpackPromise = Build.bundle(options);
    } else {
      webpackPromise = new Q();
    }

    Build.watch(options);

    return webpackPromise
    .then(function(val) {
      logging.logger.info('∆ Starting dev server.\n'.yellow.bold);
      //TODO: update livereload for v2
      options.watchPatterns = null;
      options.livereloadOptions = {
        livereload: path.resolve(__dirname + '/../assets/livereload.js')
      }
      return Serve.runLivereload(options, app);
    })
    .then(function(server) {
      logging.logger.info('√ Running live reload server:'.green.bold, options.liveReloadServer);
      if (options.useProxy) {
        return Serve.setupProxy(options, app);
      }
    })
    .then(function() {
      return Serve.startServer(options, app);
    })
    .then(function() {
      if (!options.nolivereload) {
        logging.logger.info('√ Watching:'.green.bold, watchPatterns);
        vfs.watch(watchPatterns, {}, function(f) {
          Serve._changed(f.path, options);
        });
      }
    })
    .then(function() {
      return Serve.openBrowser(options);
    })
    .catch(function(ex) {
      throw ex;
    });
  } catch (e) {
    logging.logger.error(e);
  }
};
