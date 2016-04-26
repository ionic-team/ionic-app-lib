var Store = require('../lib/store');
var helpers = require('./helpers');
var logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Store', function() {

  it('should have Store defined', function() {
    expect(Store).toBeDefined();
  });
});
