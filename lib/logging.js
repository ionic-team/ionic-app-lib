var Logging = module.exports,
    winston = require('winston');

Logging.winston = winston;

Logging.logger = new winston.Logger({
  exitOnError: false,
  transports: [
    new (winston.transports.Console)({
      name: 'console',
      showLevel: false
    })
  ]
});
