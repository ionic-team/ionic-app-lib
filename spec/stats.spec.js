var helpers = require('./helpers');
var logging = require('../lib/logging');
var Q = require('q');
var rewire = require('rewire');

logging.logger = helpers.testingLogger;

describe('Stats', function() {
  var Stats = rewire('../lib/stats');

  beforeEach(function() {
    Stats = rewire('../lib/stats');
  });

  it('should have Stats defined', function() {

    // console.log(Stats);
    expect(Stats).toBeDefined();
    expect(Stats.client).toBeNull();
    expect(Stats.initClient).toBeDefined();
    expect(Stats.trackAction).toBeDefined();
    expect(Stats.createId).toBeDefined();
    expect(Stats.getUniqueId).toBeDefined();
    expect(Stats.gatherAdditionalruntimeStats).toBeDefined();

  });

  describe('#client', function() {

    beforeEach(function() {
      Stats.client = null;
    });

    it('should throw an error to init a client without a token', function() {
      expect(function() {
        Stats.initClient();
      }).toThrow('You must pass a token back to initialize a stat client');
    });

    it('should init a client with token', function() {
      Stats.initClient('some-token');

      expect(Stats.client).not.toBeNull();
      expect(Stats.client.token).toBe('some-token');
    });

    it('should throw an error if attempting to track actions before client is init', function() {
      expect(function() {
        expect(Stats.client).toBeNull();
        Stats.trackAction();
      }).toThrow('No client is available');
    });

    it('should not track events if stats opt out', function() {
      var ionicConfigSpy = jasmine.createSpyObj('ionicConfig', ['get', 'set']);

      // get call for stats opt out
      ionicConfigSpy.get.andReturn(true);
      spyOn(Stats, 'gatherAdditionalruntimeStats');

      Stats.__set__('ionicConfig', ionicConfigSpy);

      Stats.initClient('token');
      Stats.trackAction('/some/path', 'build', {});

      expect(ionicConfigSpy.get).toHaveBeenCalledWith('statsOptOut');
      expect(Stats.gatherAdditionalruntimeStats).not.toHaveBeenCalled();

    });

    it('should call stats client track when properly initialized', function(done) {
      var ionicConfigSpy = jasmine.createSpyObj('ionicConfig', ['get', 'set']);

      // get call for stats opt out
      ionicConfigSpy.get.andReturn(false);
      spyOn(Stats, 'gatherAdditionalruntimeStats');

      Stats.__set__('ionicConfig', ionicConfigSpy);

      Stats.initClient('token');

      spyOn(Stats.client, 'track').andCallFake(function(command, data, cb) {
        cb(null, 'result-data');
      });

      Q()
      .then(function() {
        return Stats.trackAction('/some/path', 'docs', {});
      })
      .then(function() {
        expect(ionicConfigSpy.get).toHaveBeenCalledWith('statsOptOut');
        expect(Stats.gatherAdditionalruntimeStats).toHaveBeenCalled();
        expect(Stats.client.track).toHaveBeenCalled();
        expect(Stats.client.track.calls[0].args[0]).toBe('docs');
      })
      .catch(function(ex) {
        expect('this').toBe(ex.stack);
      })
      .fin(done);

    });

    it('should call reject promise if client fails to track', function(done) {
      var ionicConfigSpy = jasmine.createSpyObj('ionicConfig', ['get', 'set']);

      // get call for stats opt out
      ionicConfigSpy.get.andReturn(false);
      spyOn(Stats, 'gatherAdditionalruntimeStats');

      Stats.__set__('ionicConfig', ionicConfigSpy);

      Stats.initClient('token');

      spyOn(Stats.client, 'track').andCallFake(function(command, data, cb) {
        cb('Error!', null);
      });

      Q()
      .then(function() {
        return Stats.trackAction('/some/path', 'docs', {});
      })
      .catch(function(ex) {
        expect(ionicConfigSpy.get).toHaveBeenCalledWith('statsOptOut');
        expect(Stats.gatherAdditionalruntimeStats).toHaveBeenCalled();
        expect(Stats.client.track).toHaveBeenCalled();
        expect(Stats.client.track.calls[0].args[0]).toBe('docs');

        expect(ex).toBe('Error!');
      })
      .fin(done);
    });
  });
});
