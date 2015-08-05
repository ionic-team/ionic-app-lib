var fs = require('fs'),
    IonicAppLib = module.exports,
    path = require('path');

//
// Setup all modules as lazy-loaded getters.
//
fs.readdirSync(path.join(__dirname, 'lib')).forEach(function (file) {
  var command = file.replace('.js', '');

  IonicAppLib.__defineGetter__(command, function () {
    return require('./lib/' + command);
  });
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
