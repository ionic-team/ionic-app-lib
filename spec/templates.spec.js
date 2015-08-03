var Templates = require('../lib/templates'),
    events = require('../lib/events'),
    helpers = require('./helpers'),
    l = require('../lib/logging');

l.logger = helpers.testingLogger;

describe('Templates', function() {

  it('should have Templates defined', function() {
    expect(Templates).toBeDefined();
  });

});
