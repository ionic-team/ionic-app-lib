var path = require('path'),
    colors = require('colors'),
    Q = require('q'),
    webpack = require('webpack'),
    logging = require('../logging');

var Build = module.exports;

Build.bundle = function bundle(appDirectory, watch, cb, options) {
  var q = Q.defer();

  // prevent gulp calling done callback more than once when watching
  var firstTime = true;

  // load webpack config
  var config,
      webPackConfigPath = path.join(appDirectory, 'webpack.config.js');

  try {
    logging.logger.info('∆ Compiling and bundling with Webpack...'.yellow.bold);
    config = require(webPackConfigPath);
    logging.logger.info(['√ Using your webpack.config.js file:', webPackConfigPath, ''].join(' ').green.bold);
  } catch (ex) {
    //TODO generate one
    logging.logger.error('No webpack.config.js found'.red.bold);
  }

  // use Ionic CLI's loaders so we don't have to install them in every project
  // if (config.resolveLoader && config.resolveLoader.modulesDirectories) {
  //   config.resolveLoader.modulesDirectories.concat(path.normalize(__dirname + '../../../node_modules'));
  // } else {
  //   config.resolveLoader = {
  //     modulesDirectories: ["node_modules", path.normalize(__dirname + '../../../node_modules')]
  //   }
  // }

  var compiler = webpack(config);
  if (watch) {
    //TODO expose watch options
    compiler.watch(null, compileHandler);
  } else {
    compiler.run(compileHandler);
  }

  function compileHandler(err, stats){
    if (err) {
      return q.reject(err);
    }

    if (firstTime) {
      firstTime = false;
      cb();
      printStats(stats);
    } else {
      printStats(stats);
      var Serve = require('./serve');
      console.log();
      Serve.printCommandTips();
      process.stdout.write('ionic $'); //fake prompt
      var bundleFile = path.resolve(path.join(compiler.options.output.path,
                             compiler.options.output.filename));
      Serve._postToLiveReload(bundleFile, options);
    }

    return q.resolve();
  }

  return q.promise;
};

function printStats(stats) {
  var jsonStats = stats.toJson();

  if (jsonStats.errors.length > 0) {
    logging.logger.error('\nThere were some errors with webpack'.error);
    logging.logger.error(jsonStats.errors.toString().error);

  } else if (jsonStats.warnings.length > 0) {
    logging.logger.debug('There are some warnings');
    logging.logger.debug(jsonStats.warnings);

  } else {
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
}
