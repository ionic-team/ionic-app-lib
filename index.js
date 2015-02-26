var start = require('./lib/start'),
    upload = require('./lib/upload'),
    events = require('./lib/events');

module.exports = {
  events: events,
  start: start,
  upload: upload
}
