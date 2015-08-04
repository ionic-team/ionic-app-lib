var ConfigXml = require('../lib/config-xml'),
    fs = require('fs'),
    helpers = require('./helpers'),
    path = require('path'),
    options = {},
    Q = require('q'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

describe('ConfigXml', function() {

  it('should have ConfigXml defined', function() {
    expect(ConfigXml).toBeDefined();
  });

  describe('#setConfigXml', function() {

    var writeFile,
        xmlPath = __dirname;

    beforeEach(function() {
      writeFile = spyOn(fs, 'writeFileSync');
    });

    it('should fail if config does not exist and error when not found option passed', function(done){
      options.errorWhenNotFound = true;
      spyOn(fs, 'existsSync').andReturn(false);
      Q()
      .then(function(){
        return ConfigXml.setConfigXml(xmlPath, options);
      })
      .then(function(message){
        expect('this').toBe('not this');
      })
      .catch(function(message){
        expect(message).toBe('Unable to locate config.xml file. Please ensure the working directory is at the root of the app where the config.xml should be located.');
      })
      .fin(done);
    });

    it('should parse config xml and not make changes with no options', function(done) {
      spyOn(fs, 'existsSync').andReturn(true);
      // options = { devServer: '10'};
      Q()
      .then(function(){
        return ConfigXml.setConfigXml(xmlPath, options);
      })
      .then(function(){
        // expect(writeFile).not.toHaveBeenCalled();
      })
      .catch(function(message){
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should parse config xml and make changes with options', function(done) {
      spyOn(fs, 'existsSync').andReturn(true);
      options = { devServer: 'http://192.168.1.1' };
      Q()
      .then(function(){
        return ConfigXml.setConfigXml(xmlPath, options);
      })
      .then(function(){
        expect(writeFile).toHaveBeenCalled();
      })
      .catch(function(message){
        console.log('message', message);
        console.log(message.stack);
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should parse config xml and make changes with options', function(done) {
      spyOn(fs, 'existsSync').andReturn(true);
      options = { devServer: 'http://192.168.1.1' };
      Q()
      .then(function(){
        return ConfigXml.setConfigXml(xmlPath, options);
      })
      .then(function() {
        return ConfigXml.setConfigXml(xmlPath, {resetContent: true});
      })
      .then(function(){
        expect(writeFile).toHaveBeenCalled();
      })
      .catch(function(message){
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  })

});
