var MultiBar = require('../lib/multibar'),
    events = require('../lib/events'),
    helpers = require('./helpers'),
    l = require('../lib/logging');

l.logger = helpers.testingLogger;

describe('MultiBar', function() {

  it('should have MultiBar defined', function() {
    expect(MultiBar).toBeDefined();
  });

});
