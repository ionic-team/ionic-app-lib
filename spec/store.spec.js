var Store = require('../lib/store'),
    events = require('../lib/events'),
    helpers = require('./helpers'),
    l = require('../lib/logging');

l.logger = helpers.testingLogger;

describe('Store', function() {

  it('should have Store defined', function() {
    expect(Store).toBeDefined();
  });

});
