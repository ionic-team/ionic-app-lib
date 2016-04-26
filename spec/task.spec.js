var Task = require('../lib/task');
var helpers = require('./helpers');
var logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Task', function() {

  it('should have Task defined', function() {
    expect(Task).toBeDefined();
  });
});
