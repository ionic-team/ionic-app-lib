var winston = require('winston');

module.exports = logging = winston;

module.exports.defaultLogger = new logging.Logger({
  transports: [
    new (logging.transports.Console)({
      showLevel: false
    }),
  ]
});
