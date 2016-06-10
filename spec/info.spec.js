var rewire = require('rewire');
var Info = rewire('../lib/info');

describe('Info', function() {

  it('should have info defined', function() {
    expect(Info).toBeDefined();
    expect(Info.getMacInfo).toEqual(jasmine.any(Function));
    expect(Info.getCordovaInfo).toEqual(jasmine.any(Function));
    expect(Info.getXcodeInfo).toEqual(jasmine.any(Function));
    expect(Info.getIosSimInfo).toEqual(jasmine.any(Function));
    expect(Info.getIosDeployInfo).toEqual(jasmine.any(Function));
    expect(Info.getIonicCliVersion).toEqual(jasmine.any(Function));
    expect(Info.getIonicLibVersion).toEqual(jasmine.any(Function));
    expect(Info.getIonicVersion).toEqual(jasmine.any(Function));
    expect(Info.getWindowsEnvironmentInfo).toEqual(jasmine.any(Function));
    expect(Info.getLinuxEnvironmentInfo).toEqual(jasmine.any(Function));
    expect(Info.getOsEnvironment).toEqual(jasmine.any(Function));
    expect(Info.getNodeVersion).toEqual(jasmine.any(Function));
    expect(Info.gatherGulpInfo).toEqual(jasmine.any(Function));
    expect(Info.gatherInfo).toEqual(jasmine.any(Function));
    expect(Info.printInfo).toEqual(jasmine.any(Function));
    expect(Info.checkRuntime).toEqual(jasmine.any(Function));
    expect(Info.run).toEqual(jasmine.any(Function));
  });
});
