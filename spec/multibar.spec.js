var MultiBar = require('../lib/multibar');
var helpers = require('./helpers');
var logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('MultiBar', function() {

  it('should have MultiBar defined', function() {
    expect(MultiBar).toBeDefined();
  });
});
