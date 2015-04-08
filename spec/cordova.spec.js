var Cordova = require('../lib/cordova'),
    Q = require('q'),
    events = require('../lib/events'),
    helpers = require('./helpers');

describe('Info', function() {

  it('should have Cordova defined', function() {
    expect(Cordova).toBeDefined();
  });

});
