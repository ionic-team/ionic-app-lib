var path = require('path'),
    colors = require('colors'),
    Q = require('q'),
    webpack = require('webpack'),
    logging = require('../logging'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    watch = require('gulp-watch'),
    vfs = require('vinyl-fs'),
    Utils = require('../utils');

var Build = module.exports;

//TODO defaults should be provided when config is loaded initially, but for now
// this requires the least amount of changes to the rest of the CLI
var defaultPaths = {
  sass: {
    src: ['app/app.+(ios|md).scss'],
    dest: 'www/build/css',
    include: ['node_modules/ionic-framework']
  },
  fonts: {
    src: ['node_modules/ionic-framework/fonts/**/*.ttf'],
    dest: "www/build/fonts"
  },
  watch: {
    sass: ['app/**/*.scss'],
    livereload: [
      'www/**/*.html',
      'www/build/**/*.js',
      'www/build/**/*.css'
    ]
  }
};

var defaultAutoPrefixerOptions = {
  browsers: [
    'last 2 versions',
    'iOS >= 7',
    'Android >= 4',
    'Explorer >= 10',
    'ExplorerMobile >= 11'
  ],
  cascade: false
};

function isDefined(val) {return typeof val !== 'undefined';}


Build.bundle = function(options) {
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
      // console.log();
      // Serve.printCommandTips();
      // process.stdout.write('ionic $'); //fake prompt
      var bundleFile = path.resolve(path.join(compiler.options.output.path,
                             compiler.options.output.filename));
      Serve._postToLiveReload(bundleFile, options);
    }

    logging.logger.info('\n√ Webpack complete\n'.green.bold);
    q.resolve();
  }

  return q.promise;
};

Build.watch = function(options, cb) {
  Build.sass(options);
  Build.fonts(options);

  var configPaths = options.config.paths;
  var sassWatchPaths;
  if (configPaths && configPaths.watch && configPaths.watch.sass) {
    sassWatchPaths = configPaths.watch.sass;
  } else {
    logging.logger.info('No sass watch patterns found, using [\'www/app/**/*.scss\']');
    sassWatchPaths = defaultPaths.watch.sass;
  }

  watch(sassWatchPaths, function(){
    Build.sass(options);
  })
}

Build.sass = function(options) {
  logging.logger.info('\n∆ Compiling Sass to CSS'.yellow.bold);

  var configPaths = options.config.paths || defaultPaths;
  var sassPaths = configPaths.sass || defaultPaths.sass;
  var sassSrcPaths = isDefined(sassPaths.src) ? sassPaths.src : defaultPaths.sass.src;
  var sassIncludePaths = isDefined(sassPaths.include) ? sassPaths.include : defaultPaths.sass.include;
  var sassDestPath = isDefined(sassPaths.dest) ? sassPaths.dest : defaultPaths.sass.dest;
  var autoPrefixerOptions = options.config.autoPrefixerOptions || defaultAutoPrefixerOptions;

  vfs.src(sassSrcPaths)
    .pipe(sass({ includePaths: sassIncludePaths }))
    .on('error', function(err){
      console.error(err.message);
      this.emit('end');
    })
    .pipe(autoprefixer(autoPrefixerOptions))
    .pipe(vfs.dest(path.resolve(sassDestPath)))
    .on('end', function(){
      logging.logger.info('√ Sass complete'.green.bold);
      //cb()
    });
}

Build.fonts = function(options) {
  var fontPaths = (options.config.paths && options.config.paths.fonts) || defaultPaths.fonts;
  var fontSrcPaths = isDefined(fontPaths.src) ? fontPaths.src : defaultPaths.fonts.src;
  var fontDestPath = isDefined(fontPaths.dest) ? fontPaths.dest : defaultPaths.fonts.dest;

  vfs.src(fontSrcPaths)
    .pipe(vfs.dest(fontDestPath));
    // .on('end', cb);
}

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


