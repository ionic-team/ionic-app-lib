var Q = require('q'),
    setup = require('../lib/setup'),
    testDir = '/some/ionic/app',
    helpers = require('./helpers'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Setup', function() {

  it('should be defined', function() {
    expect(setup).toBeDefined();
  });

  it('should set up sass correctly', function(done) {
    spyOn(setup, 'npmInstall').andReturn(Q());
    spyOn(setup, 'modifyIndexFile').andReturn(Q());
    spyOn(setup, 'buildSass').andReturn(Q());
    
    Q()
    .then(function(){
      return setup.sassSetup(testDir);
    })
    .then(function(){
      expect(setup.npmInstall).toHaveBeenCalledWith(testDir);
      expect(setup.modifyIndexFile).toHaveBeenCalledWith(testDir);
      expect(setup.buildSass).toHaveBeenCalledWith(testDir);
    })
    .catch(function(ex){
      console.log(ex);
      expect('this').toBe('not this');
    })
    .fin(done);
  });

  xit('should install npm modules correctly', function(){

  });
});
