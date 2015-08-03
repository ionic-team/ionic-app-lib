var Project = require('../lib/project'),
    share = require('../lib/share'),
    Q = require('q'),
    events = require('../lib/events'),
    fs = require('fs'),
    helpers = require('./helpers'),
    l = require('../lib/logging');

l.logger = helpers.testingLogger;

describe('Share', function() {

  it('should have share app defined', function() {
    expect(share.shareApp).toBeDefined();
  });
});
