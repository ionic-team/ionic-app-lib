var Stats = require('../lib/stats'),
    events = require('../lib/events'),
    helpers = require('./helpers'),
    l = require('../lib/logging');

l.logger = helpers.testingLogger;

describe('Stats', function() {

  it('should have Stats defined', function() {
    expect(Stats).toBeDefined();
  });

});
