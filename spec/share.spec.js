var Project = require('../lib/project'),
    share = require('../lib/share'),
    Q = require('q'),
    events = require('../lib/events'),
    fs = require('fs'),
    helpers = require('./helpers'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Share', function() {

  it('should have share app defined', function() {
    expect(share.shareApp).toBeDefined();
  });
});
