var serve = require('./lib/serve'),
    start = require('./lib/start'),
    upload = require('./lib/upload'),
    events = require('./lib/events');

module.exports = {
  events: events,
  serve: serve,
  start: start,
  upload: upload
}
