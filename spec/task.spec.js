var Task = require('../lib/task'),
    events = require('../lib/events'),
    helpers = require('./helpers'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Task', function() {

  it('should have Task defined', function() {
    expect(Task).toBeDefined();
  });

});
