var Hooks = require('../lib/hooks'),
    path = require('path'),
    helpers = require('./helpers'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Hooks', function() {

  it('should have Hooks defined', function() {
    expect(Hooks).toBeDefined();
  });

  // it('e2e setting hooks permissions', function(done) {
  //   var tmp = helpers.tmpDir('hook');
  //   var appName = 'app';
  //   var appPath = path.join(tmp, appPath);


  //   try {
  //     Hooks.setHooksPermission(appPath);
  //     expect(fs.chdModSync).toHaveBeenCalledWith('')
  //   } catch (ex) {
  //     expect('this').noBe('not this');
  //   }

  //   shelljs.rm('rf', appPath);

  // });  

});
