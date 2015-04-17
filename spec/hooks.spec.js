var Hooks = require('../lib/hooks'),
    events = require('../lib/events'),
    path = require('path'),
    helpers = require('./helpers');

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
