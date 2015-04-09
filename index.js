var cordova = require('./lib/cordova'),
    events = require('./lib/events'),
    info = require('./lib/info'),
    serve = require('./lib/serve'),
    start = require('./lib/start'),
    state = require('./lib/state'),
    upload = require('./lib/upload'),
    utils = require('./lib/utils');

module.exports = {
  cordova: cordova,
  events: events,
  info: info,
  serve: serve,
  start: start,
  state: state,
  upload: upload,
  utils: utils
}
