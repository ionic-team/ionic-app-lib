var setup = require('../lib/setup');

describe('Setup', function() {

  it('should be defined', function() {
    expect(setup).toBeDefined();
  });

  it('should set up sass correctly', function() {
    setup.sassSetup();
  });

  xit('should install npm modules correctly', function(){

  });
});
