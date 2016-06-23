var winston = require('winston');

var logger = new winston.Logger({
  exitOnError: false,
  transports: [
    new (winston.transports.Console)({
      name: 'console',
      showLevel: false
    })
  ]
});

// To be used by helpers createDefaultLogger and createLoggerWithFile
function createLogger(transports, level) {
  level = level || 'info';
  return logger = new winston.Logger({
    exitOnError: false,
    level: level,
    transports: transports
  });
}

function createDefaultLogger(level) {
  level = level || 'info';
  var transports = [
    new (winston.transports.Console)({
      name: 'console',
      showLevel: false
    })
  ];
  return createLogger(transports, level);
}

function createLoggerWithFile(logFilePath, level) {
  var transports = [
    new (winston.transports.File)({
      filename: logFilePath,
      name: 'file'
    })
  ];
  return createLogger(transports, level);
}

function queryLogs(searchText, timestamp) {
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
}

module.exports = {
  winston: winston,
  logger: logger,
  createLogger: createLogger,
  createDefaultLogger: createDefaultLogger,
  createLoggerWithFile: createLoggerWithFile,
  queryLogs: queryLogs
};
