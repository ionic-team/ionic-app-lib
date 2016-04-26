var share = require('../lib/share');
var helpers = require('./helpers');
var logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Share', function() {

  it('should have share app defined', function() {
    expect(share.shareApp).toBeDefined();
  });
});
