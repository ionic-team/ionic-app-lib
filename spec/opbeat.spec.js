var Opbeat = require('../lib/opbeat'),
    events = require('../lib/events'),
    helpers = require('./helpers'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Opbeat', function() {
  it('should have state defined', function() {
    expect(Opbeat).toBeDefined();
  });

  it('should init the opbeat client with the correct settings', function() {
    spyOn(Opbeat, 'createOpbeatClient');
    Opbeat.createCliClient();
    expect(Opbeat.createOpbeatClient).toHaveBeenCalledWith(Opbeat.cliClientOptions);
  });

  it('should use the options you pass to init the client', function() {
    spyOn(Opbeat, 'createOpbeatClient');
    var options = {
      organizationId: 'orgId',
      appId: 'appId',
      secretToken: 'secId',
      clientLogLevel: 'cliId',
      prerequestMethod: function() {}
    };
    Opbeat.createCliClient(options);
    expect(Opbeat.createOpbeatClient).toHaveBeenCalledWith(options);
  });


  it('should use the options you pass to init the gui client', function() {
    spyOn(Opbeat, 'createOpbeatClient');
    var options = {
      organizationId: 'orgId',
      appId: 'appId',
      secretToken: 'secId',
      clientLogLevel: 'cliId',
      prerequestMethod: function() {}
    };
    Opbeat.createGuiClient(options);
    expect(Opbeat.createOpbeatClient).toHaveBeenCalledWith(options);
  });
});
