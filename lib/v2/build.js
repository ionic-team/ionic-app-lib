var path = require('path'),
    colors = require('colors'),
    Q = require('q'),
    webpack = require('webpack'),
    logging = require('../logging'),
    Utils = require('../utils');

var Build = module.exports;

Build.bundle = function bundle(options) {
  var q = Q.defer();

  //optional callback to be trigged on builds
  options.callback = options.callback || function() { };
  var firstTime = true;

  // load webpack config
  var config,
      webPackConfigPath = path.join(options.appDirectory, 'webpack.config.js');

  try {
    logging.logger.info('∆ Compiling and bundling with Webpack...'.yellow.bold);
    config = require(webPackConfigPath);
    logging.logger.info(['√ Using your webpack.config.js file:', webPackConfigPath, ''].join(' ').green.bold);
  } catch (ex) {
    //TODO generate one
    logging.logger.error('There was an error loading webpack.config.js:'.red.bold);
    Utils.fail(ex);
  }

  var compiler = webpack(config);
  if (options.watch) {
    //TODO expose watch options
    compiler.watch(null, compileHandler);
  } else {
    compiler.run(compileHandler);
  }

  function compileHandler(err, stats){
    if (err) {
      return q.reject(err);
    }

    var jsonStats = stats.toJson();

    if (firstTime) {
      firstTime = false;
      options.callback();
      nonTypeErrors = jsonStats.errors.filter(function(err){
        // lame heuristic for type errors emitted by awesome-typescript-loader
        return err.charAt(0) !== '[';
      })
      if (nonTypeErrors.length > 0) {
        // bail if error on initial build
        // return q.reject(jsonStats.errors.toString());

        //hard fail until error reporting is updated
        Utils.fail(jsonStats.errors.toString());
      }

      printStats(stats, jsonStats);

    } else {
      printStats(stats, jsonStats);

      var Serve = require('./serve');
      console.log();
      Serve.printCommandTips();
      process.stdout.write('ionic $'); //fake prompt
      var bundleFile = path.resolve(path.join(compiler.options.output.path,
                             compiler.options.output.filename));
      Serve._postToLiveReload(bundleFile, options);
    }

    q.resolve();
  }

  return q.promise;
};

function printStats(stats, jsonStats) {
  if (jsonStats.warnings.length > 0) {
    logging.logger.debug('There are some warnings');
    logging.logger.debug(jsonStats.warnings);
  }
  // TODO expose this
  // https://github.com/webpack/docs/wiki/node.js-api#statstojsonoptions
  var statsOptions = {
    'colors': true,
    'modules': true,
    'chunks': false,
    'exclude': ['node_modules']
  }

  logging.logger.info('\n' + stats.toString(statsOptions));
}
