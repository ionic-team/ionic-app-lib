var Info = require('../lib/info'),
    Q = require('q'),
    events = require('../lib/events'),
    helpers = require('./helpers');

describe('Info', function() {

  it('should have info defined', function() {
    expect(Info).toBeDefined();
  });

  it('should have gatherInfo defined', function() {
    expect(Info.gatherInfo).toBeDefined();
  });

  it('should have gatherInfo call other helper methods', function() {
    spyOn(Info, 'getIonicLibVersion');
    spyOn(Info, 'getNodeVersion');
    spyOn(Info, 'getOsEnvironment');
    spyOn(Info, 'getCordovaInfo');

    Info.gatherInfo();

    expect(Info.getIonicLibVersion).toHaveBeenCalled();
    expect(Info.getNodeVersion).toHaveBeenCalled()
    expect(Info.getOsEnvironment).toHaveBeenCalled();
    expect(Info.getCordovaInfo).toHaveBeenCalled();    
  });

});
