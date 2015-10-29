var fs = require('fs'),
    IonicAppLib = module.exports,
    path = require('path');

var capitalize = function capitalize(str) {
  return str && str[0].toUpperCase() + str.slice(1);
};

var camelCase = function camelCase(input) { 
    return input.toLowerCase().replace(/-(.)/g, function(match, group1) {
        return group1.toUpperCase();
    });
};

//
// Setup all modules as lazy-loaded getters.
//
fs.readdirSync(path.join(__dirname, 'lib')).forEach(function (file) {
  if (file === 'v2') return;

  file = file.replace('.js', '');
  var command;

  if (file.indexOf('-') > 0) {
    // console.log('file', file);
    command = camelCase(file);
  } else {
    command = file;
  }

  IonicAppLib.__defineGetter__(command, function () {
    return require('./lib/' + file);
  });
});

IonicAppLib.v2 = {};
fs.readdirSync(path.join(__dirname, 'lib/v2')).forEach(function (file) {
  file = file.replace('.js', '');
  var command;

  if (file.indexOf('-') > 0) {
    // console.log('file', file);
    command = camelCase(file);
  } else {
    command = file;
  }

  IonicAppLib.v2.__defineGetter__(command, function () {
    return require('./lib/v2/' + file);
  });
});

IonicAppLib.__defineGetter__('semver', function () {
  return require('semver');
});


// var browser = require('./lib/browser'),
//     configXml = require('./lib/config-xml'),
//     cordova = require('./lib/cordova'),
//     events = require('./lib/events'),
//     hooks = require('./lib/hooks'),
//     info = require('./lib/info'),
//     ioConfig = require('./lib/io-config'),
//     login = require('./lib/login'),
//     logging = require('./lib/logging'),
//     multibar = require('./lib/multibar'),
//     opbeat = require('./lib/opbeat'),
//     project = require('./lib/project'),
//     share = require('./lib/share'),
//     semver = require('semver'),
//     serve = require('./lib/serve'),
//     settings = require('./lib/settings'),
//     setup = require('./lib/setup'),
//     start = require('./lib/start'),
//     state = require('./lib/state'),
//     upload = require('./lib/upload'),
//     utils = require('./lib/utils');

// module.exports = {
//   browser: browser,
//   configXml: configXml,
//   cordova: cordova,
//   events: events,
//   hooks: hooks,
//   info: info,
//   ioConfig: ioConfig,
//   login: login,
//   logging: logging,
//   multibar: multibar,
//   opbeat: opbeat,
//   project: project,
//   share: share,
//   semver: semver,
//   serve: serve,
//   settings: settings,
//   setup: setup,
//   start: start,
//   state: state,
//   upload: upload,
//   utils: utils
// }
