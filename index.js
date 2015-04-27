var browser = require('./lib/browser'),
    configXml = require('./lib/config-xml'),
    cordova = require('./lib/cordova'),
    events = require('./lib/events'),
    hooks = require('./lib/hooks'),
    info = require('./lib/info'),
    multibar = require('./lib/multibar'),
    opbeat = require('./lib/opbeat'),
    serve = require('./lib/serve'),
    start = require('./lib/start'),
    state = require('./lib/state'),
    upload = require('./lib/upload'),
    utils = require('./lib/utils');

module.exports = {
  browser: browser,
  configXml: configXml,
  cordova: cordova,
  events: events,
  hooks: hooks,
  info: info,
  multibar: multibar,
  opbeat: opbeat,
  serve: serve,
  start: start,
  state: state,
  upload: upload,
  utils: utils
}
