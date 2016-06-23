/*
 * portfinder.js: A simple tool to find an open port on the current machine.
 *
 * (C) 2011, Charlie Robbins
 *
 */

var net = require('net');

//
// ### @basePort {Number}
// The lowest port to begin any port search from
//
var basePort = 8000;

//
// ### @basePath {string}
// Default path to begin any socket search from
//
var basePath = '/tmp/portfinder';

function getPort(options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }

  options.port   = options.port   || exports.basePort;
  options.host   = options.host   || null;
  options.server = options.server || net.createServer(function() {

    //
    // Create an empty listener for the port testing server.
    //
  });

  function onListen() {
    options.server.removeListener('error', onError);
    options.server.close();
    callback(null, options.port);
  }

  function onError(err) {
    options.server.removeListener('listening', onListen);

    if (err.code !== 'EADDRINUSE' && err.code !== 'EACCES') {
      return callback(err);
    }

    exports.getPort({
      port: exports.nextPort(options.port),
      host: options.host,
      server: options.server
    }, callback);
  }

  options.server.once('error', onError);
  options.server.once('listening', onListen);
  options.server.listen(options.port, options.host);
}

//
// ### function nextPort (port)
// #### @port {Number} Port to increment from.
// Gets the next port in sequence from the
// specified `port`.
//
function nextPort(port) {
  return port + 1;
}

module.exports = {
  basePort: basePort,
  basePath: basePath,
  getPort: getPort,
  nextPort: nextPort
};
