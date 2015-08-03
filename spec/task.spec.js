var Task = require('../lib/task'),
    events = require('../lib/events'),
    helpers = require('./helpers'),
    l = require('../lib/logging');

l.logger = helpers.testingLogger;

describe('Task', function() {

  it('should have Task defined', function() {
    expect(Task).toBeDefined();
  });

});
