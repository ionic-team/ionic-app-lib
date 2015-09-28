var fs = require('fs'),
    autoprefixer = require('autoprefixer'),
    postcss = require('postcss'),
    browserSync = require('browser-sync'),
    colors = require('colors'),
    archiver = require('archiver'),
    ConfigXml = require('./config-xml'),
    logging = require('./logging'),
    Multibar = require('./multibar'),
    Opbeat = require('./opbeat'),
    path = require('path'),
    Q = require('q'),
    sass = require('node-sass'),
    shelljs = require('shelljs'),
    vinylFs = require('vinyl-fs'),
    webpack = require('webpack');

var Transpile = module.exports;

Transpile.autoprefixerOpts = {
  browsers: [
    'last 2 versions',
    'iOS >= 7',
    'Android >= 4',
    'Explorer >= 10',
    'ExplorerMobile >= 11'
  ],
  cascade: false
};

Transpile.defaultWebpackConfig = {
  entry: [
    "zone.js",
    "traceur-runtime",
    "reflect-metadata",
    "rtts_assert/rtts_assert",
    "angular2/angular2",
    "ionic/ionic",
    "./www/app/app.js" // your app entry
  ],
  output: {
    path: __dirname + "/www",
    filename: "build/js/app.bundle.js",
    //pathinfo: true // show module paths in the bundle, handy for debugging
  },
  postcss: [ autoprefixer(Transpile.autoprefixerOpts) ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: "awesome-typescript-loader?doTypeCheck=false&useBabel=true&useWebpackText=true",
        include: /app\//
      },
      { test: /\.ts$/, loader: "awesome-typescript-loader", include: /app\// },
      {
        test: /\.scss$/,
        loader: "style!css!sass?outputStyle=expanded"
      },
      {
        test: /\.css$/,
        loader: "style-loader!css-loader!postcss-loader"
      }
    ]
  },
  resolve: {
    modulesDirectories: [
      "node_modules",
      "node_modules/ionic-framework/src/es5/common", // ionic-framework npm package (stable)
      "node_modules/ionic-framework/node_modules" // angular is a dependency of ionic

      //"node_modules/ionic2/dist/src/es5/common", // driftyco/ionic2 github repo (master)
      //"node_modules/ionic2/node_modules"
    ],
    extensions: ["", ".js", ".ts"]
  }
};

Transpile.compile = function compile(appDirectory, watch, cb) {
  var q = Q.defer();

  // prevent gulp calling done callback more than once when watching
  var firstTime = true;

  // load webpack config
  var config,
      webPackConfigPath = path.join(appDirectory, 'webpack.config.js');

  try {
    config = require(webPackConfigPath);
    logging.logger.info(['√ Using your webpack.config.js file:', webPackConfigPath, ''].join(' ').green.bold);
  } catch (ex) {
    //No config existed. Use default;
    logging.logger.info('√ Using default Ionic webpack.config settings.'.green.bold);
    config = Transpile.defaultWebpackConfig;
  }

  logging.logger.verbose('compile config:', config);

  // https://github.com/webpack/docs/wiki/node.js-api#statstojsonoptions
  var statsOptions = {
    'colors': true,
    'modules': true,
    'chunks': false,
    'exclude': ['node_modules']
  }

  // run (one time compile) or watch
  // https://github.com/webpack/docs/wiki/node.js-api
  var compilerFunc = (watch ? 'watch' : 'run');
  var compilerFuncArgs = [compileHandler];
  watch && compilerFuncArgs.unshift(null); // watch takes config obj as first arg

  // Call compiler.run(compileHandler) or compiler.watch(null, compileHandler)
  var compiler = webpack(config);
  compiler[compilerFunc].apply(compiler, compilerFuncArgs);

  function compileHandler(err, stats){
    if (firstTime) {
      firstTime = false;
      cb();
    } else {
      browserSync.reload();
    }

    // print build stats and errors
    logging.logger.debug(stats.toString(statsOptions));
    q.resolve(stats.toString(statsOptions));
  }

  return q.promise;
};


Transpile.processSass = function processSass(appDirectory) {
  var q = Q.defer();
  logging.logger.debug('Process sass appDirectory', appDirectory);

  Transpile.checkBuildDirectories(appDirectory);

  var autoprefixerOpts = {
    browsers: [
      'last 2 versions',
      'iOS >= 7',
      'Android >= 4',
      'Explorer >= 10',
      'ExplorerMobile >= 11'
    ],
    cascade: false
  };

  logging.logger.info('∆ Compiling your SASS to CSS.'.yellow.bold);

  var sassFile = path.join(appDirectory, 'www', 'app', 'app.scss');
  var includePaths = [ path.join(appDirectory, 'node_modules', 'ionic-framework', 'src', 'scss') ];
  // var outputFile = path.join(appDirectory, 'www', 'build', 'css');

  var sassOutput = sass.renderSync({file: sassFile, includePaths: includePaths});

  logging.logger.info('√ Sass compiled to CSS.'.green.bold);
  // logging.logger.debug('Sass output:', sassOutput.css.toString());

  var prefixerOutput = autoprefixer(autoprefixerOpts);

  var buildFilePath = path.join(appDirectory, 'www', 'build', 'css', 'app.css');  

  logging.logger.info('∆ Running postcss and autoprefixer on compiled CSS.'.yellow.bold);

  var cssPromise = postcss([ prefixerOutput ]).process(sassOutput.css.toString())
  .then(function (result) {
    // logging.logger.info('√ Compiling CSS completed.'.green.bold);

    if (result.warnings()) {
      logging.logger.debug('There are some warnings with your build:'.yellow.bold);  
    }

    result.warnings().forEach(function (warn) {
      logging.logger.debug(warn.toString());
    });

    // logging.logger.debug('Css result:', result.css);

    logging.logger.info(['√ CSS processed to:', buildFilePath, ''].join(' ').green.bold);

    try {
      fs.writeFileSync(buildFilePath, result.css);
    } catch(ex) {
      console.log('ex', ex);
    }
  });

  // logging.logger.info('√ CSS compilation completed.'.green.bold);

  return cssPromise;
};

Transpile.prepareFonts = function prepareFonts(appDirectory) {
  logging.logger.debug('∆ Preparing fonts.'.yellow.bold);

  var tffFontPath = path.join(appDirectory, 'node_modules', 'ionic-framework', 'fonts', '**', '*.tff');
  var woffFontPath = path.join(appDirectory, 'node_modules', 'ionic-framework', 'fonts', '**', '*.woff');
  var pathsToCopy = [tffFontPath, woffFontPath];
  var copyFontsDestPath = path.join(appDirectory, 'www', 'build', 'fonts');

  vinylFs.src(pathsToCopy)
  .pipe(vinylFs.dest(copyFontsDestPath));

  logging.logger.debug('√ Fonts completed.'.green.bold);
}

Transpile.checkBuildDirectories = function checkBuildDirectories(appDirectory) {
  var buildPath = path.join(appDirectory, 'www', 'build');
  var cssBuildPath = path.join(buildPath, 'css');
  var fontBuildPath = path.join(buildPath, 'fonts');

  var paths = [buildPath, cssBuildPath, fontBuildPath];

  paths.forEach(function(pathToMk) {
    if (!fs.existsSync(pathToMk)) {
      fs.mkdirSync(pathToMk);
    }
  })
  
  // if (!fs.existsSync(buildPath)) {
  //   fs.mkdirSync(buildPath);
  // }

  // if (!fs.existsSync(cssBuildPath)) {
  //   fs.mkdirSync(cssBuildPath);
  // }
};
