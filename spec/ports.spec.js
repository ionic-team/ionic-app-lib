var Ports = require('../lib/ports'),
    events = require('../lib/events'),
    helpers = require('./helpers'),
    l = require('../lib/logging');

l.logger = helpers.testingLogger;

describe('Ports', function() {

  it('should have Ports defined', function() {
    expect(Ports).toBeDefined();
  });

});
