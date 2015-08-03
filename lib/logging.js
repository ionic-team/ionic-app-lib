var winston = require('winston');

module.exports = logging = winston;

module.exports.logger = new logging.Logger({
  transports: [
    new (logging.transports.Console)({
      showLevel: false
    }),
  ]
});
