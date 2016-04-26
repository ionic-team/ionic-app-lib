var Ports = require('../lib/ports');
var helpers = require('./helpers');
var logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Ports', function() {

  it('should have Ports defined', function() {
    expect(Ports).toBeDefined();
  });
});
