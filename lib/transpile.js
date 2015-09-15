var fs = require('fs'),
    autoprefixer = require('autoprefixer'),
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
  } catch (ex) {
    //No config existed. Use default;
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
    console.log(stats.toString(statsOptions));
    q.resolve(stats.toString(statsOptions));
  }

  return q.promise;
};


Transpile.processSass = function processSass(options) {
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

  // var sassFile = path.join(options.appDirectory, 'www', 'app', 'app.scss');
  // var outputFile = path.join(options.appDirectory, 'www', 'build', 'css');

  var sassOutput = sass.renderSync({includePaths: [path.join(options.appDirectory, 'src', 'scss')]});
  var prefixerOutput = autoprefixer(autoprefixerOpts);
  // console.log('Ya it finished.', prefixerOutput);
};
