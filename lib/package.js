var Upload = require('./upload'),
    events = require('./events');

var Package = module.exports;

Package.doPackage = function(appId, appDirectory, jar, release) {
  Upload.doUpload(appDirectory, jar, 'Ionic Package Upload');

  events.emit('log', 'hi there\n'.bold);
};
