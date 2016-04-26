var Logging = module.exports;
var winston = require('winston');

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

// To be used by helpers createDefaultLogger and createLoggerWithFile
Logging.createLogger = function createLogger(transports, level) {
  level = level || 'info';
  return Logging.logger = new winston.Logger({
    exitOnError: false,
    level: level,
    transports: transports
  });
};

Logging.createDefaultLogger = function createDefaultLogger(level) {
  level = level || 'info';
  var transports = [
    new (winston.transports.Console)({
      name: 'console',
      showLevel: false
    })
  ];
  return Logging.createLogger(transports, level);
};

Logging.createLoggerWithFile = function createLoggerWithFile(logFilePath, level) {
  var transports = [
    new (winston.transports.File)({
      filename: logFilePath,
      name: 'file'
    })
  ];
  return Logging.createLogger(transports, level);
};

Logging.queryLogs = function queryLogs(searchText, timestamp) {
  var searchDate = new Date(timestamp) || new Date();
  var options = {
    from: new Date() - 24 * 60 * 60 * 1000,
    until: searchDate,
    limit: 10,
    start: 0,
    order: 'desc',
    fields: ['message', 'level']
  };

  //
  // Find items logged between today and yesterday.
  //
  winston.query(options, function(err, results) {
    if (err) {
      throw err;
    }

    console.log(results);
  });
};
