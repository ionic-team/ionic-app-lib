var cordova = require('../lib/cordova'),
    hooks = require('../lib/hooks'),
    Q = require('q'),
    index = require('../index'),
    release = index.release,
    helpers = require('./helpers'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('Release', function() {

  it('should have methods defined', function(){
    expect(release).toBeDefined();
  });

});
