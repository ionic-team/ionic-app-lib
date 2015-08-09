var index = require('../index'),
    logging = require('../lib/logging');

describe('index', function() {

  it('should have index defined', function() {
    expect(index).toBeDefined();
  });

  function testForProperty(input) {
    it('should have ' + input + ' available', function() {
      expect(index[input]).toBeDefined();
    });
  }

  var objs = ['browser', 'configXml', 'cordova', 'events', 'hooks', 'info', 
              'ioConfig', 'login', 'logging', 'multibar', 'opbeat', 'project', 
              'share', 'semver', 'serve', 'settings', 'setup', 'start', 'state', 
              'stats', 'upload', 'utils'];
  // Doing it this way to give better failure messages. 
  // Ensures all commands are available currently from
  objs.forEach(function(obj) {
    // expect(index[obj], obj).toBeDefined();
    testForProperty(obj);
  });

});
