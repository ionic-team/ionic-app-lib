var colors = require('colors'),
    IonicInfo = require('./info'),
    Opbeat = module.exports,
    Utils = require('./utils');

Opbeat.opbeatInstance = null;

Opbeat.reportExtras = function reportExtras() {
  var commandLineInfo = process.argv;
  var info = IonicInfo.gatherInfo();
  info.command = commandLineInfo;
  console.log('Command line stuff:', commandLineInfo);
  return info;
};

Opbeat.cliClientOptions = {
  organizationId: '7456d1360946446791cde22d1ff90a56',
  appId: '1a3f490314',
  secretToken: 'f058c32e757d3c589c3c1a7236767a307b780d0b',
  clientLogLevel: 'fatal',
  prerequestMethod: Opbeat.reportExtras 
};

Opbeat.guiClientOptions = {
  organizationId: '7456d1360946446791cde22d1ff90a56',
  appId: '6273cd7d66',
  secretToken: 'f058c32e757d3c589c3c1a7236767a307b780d0b',
  clientLogLevel: 'fatal'
};

Opbeat.handleUncaughtExceptions = function handleUncaughtExceptions(err, url) {
  Utils.fail(err.message);
  process.exit(1);
};

Opbeat.createOpbeatClient = function createOpbeatClient(options) {
  Opbeat.opbeatInstance = require('opbeat-ionic')(options);
  // Opbeat.opbeatInstance.handleUncaughtExceptions(Opbeat.handleUncaughtExceptions);
};

Opbeat.createCliClient = function createCliClient(options) {
  options = options ? options : Opbeat.cliClientOptions;
  Opbeat.createOpbeatClient(options);
  return Opbeat.opbeatInstance;
};

Opbeat.createGuiClient = function createGuiClient(options) {
  options = options ? options : Opbeat.guiClientOptions;
  Opbeat.createOpbeatClient(options);
  return Opbeat.opbeatInstance;
};
