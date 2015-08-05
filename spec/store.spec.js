var Store = require('../lib/store'),
    events = require('../lib/events'),
    helpers = require('./helpers'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Store', function() {

  it('should have Store defined', function() {
    expect(Store).toBeDefined();
  });

});
