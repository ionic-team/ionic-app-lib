var Browser = require('../lib/browser'),
    events = require('../lib/events'),
    fs = require('fs'),
    helpers = require('./helpers'),
    shelljs = require('shelljs'),
    Q = require('q');

// spyOn(shelljs)

describe('Browser', function() {

  var testDirectory = '/some/fake/directory';

  it('should have Browser defined', function() {
    expect(Browser).toBeDefined();
  });

  describe('#addBrowser', function() {

    it('should fail with no parameters passed', function() {
      expect(function() {
        Browser.addBrowser();
      }).toThrow('You must pass a directory to run this command')
    });

    it('should fail with no browser passed', function() {
      expect(function() {
        Browser.addBrowser(testDirectory);
      }).toThrow('You must pass a browser to be installed');
    });

    it('should call installCrosswalk when passed the crosswalk browser', function(done) {
      spyOn(Browser, 'installCrosswalk').andReturn(Q());
      Q()
      .then(function() {
        return Browser.addBrowser(testDirectory, 'crosswalk', true);
      })
      .then(function(){
        expect(Browser.installCrosswalk).toHaveBeenCalledWith(testDirectory, Browser.defaultCrosswalkVersion, true);
      })
      .catch(function(ex){
        console.log(ex)
        console.log(ex.stack);
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should pass the saveToPackageJson flag to installCrosswalk', function(done) {
      spyOn(Browser, 'installCrosswalk').andReturn(Q());
      var saveToPackageJson = true;
      Q()
      .then(function() {
        return Browser.addBrowser(testDirectory, 'crosswalk', saveToPackageJson);
      })
      .then(function(){
        expect(Browser.installCrosswalk).toHaveBeenCalledWith(testDirectory, Browser.defaultCrosswalkVersion, saveToPackageJson);
      })
      .catch(function(ex){
        console.log(ex)
        console.log(ex.stack);
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should log to the user no accepted browser was passed', function(done) {
      // spyOn(Browser, 'installDefaultBrowser');
      spyOn(events, 'emit');
      Q()
      .then(function() {
        return Browser.addBrowser(testDirectory, 'default');
      })
      .then(function(){
        // expect(Browser.installDefaultBrowser).toHaveBeenCalledWith(testDirectory);
        expect(events.emit).toHaveBeenCalledWith('log', 'No accepted browser was specified.'.red.bold);
      })
      .catch(function(ex){
        expect('this').toBe('not this');
      })
      .fin(done);
    });

  });

  describe('#installCrosswalk', function() {
    it('should call the appropriate methods to install crosswalk', function(done) {
      spyOn(Browser, 'downloadFiles').andReturn(Q());
      var methods = [
        'removeAndroidProject', 
        'removeCrosswalkEngines',
        'addCordova40xProject',
        'addCrosswalkPlugin',
        'addWhitelistPlugin',
        'addSplashScreenPlugin'
        // 'addGradleProperties',
      ];
      var saveToPackageJson = true;
      
      methods.forEach(function(method) {
        spyOn(Browser, method);
      });

      Q()
      .then(function() {
        return Browser.installCrosswalk(testDirectory, Browser.defaultCrosswalkVersion, saveToPackageJson);
      })
      .then(function(){
        // expect(Browser.downloadFiles).toHaveBeenCalledWith(testDirectory, Browser.defaultCrosswalkVersion);
        methods.forEach(function(method) {
          expect(Browser[method]).toHaveBeenCalledWith(testDirectory, saveToPackageJson);
        })
      })
      .catch(function(ex){
        console.log(ex);
        console.log(ex.stack)
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  describe('#downloadFiles', function() {
    it('should call methods correctly to download required crosswalk files', function(done) {
      spyOn(Browser, 'downloadCordovaCrosswalkEngine').andReturn(Q());
      spyOn(Browser, 'downloadCordova40x').andReturn(Q());
      spyOn(Browser, 'downloadCrosswalkWebviews').andReturn(Q());

      Q()
      .then(function() {
        return Browser.downloadFiles(testDirectory, Browser.defaultCrosswalkVersion);
      })
      .then(function() {
        expect(Browser.downloadCordovaCrosswalkEngine).toHaveBeenCalledWith(testDirectory);
        // expect(Browser.downloadCordova40x).toHaveBeenCalledWith(testDirectory);
        expect(Browser.downloadCrosswalkWebviews).toHaveBeenCalledWith(testDirectory, Browser.defaultCrosswalkVersion);
      })
      .catch(function(error) {
        console.log('error', error, error.stack)
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  // describe('#getCordovaCrosswalkEngine', function() {
  //   iit('should call Ionic.fetchArchive', function(done) {
  //     spyOn(fs, 'existsSync').andReturn(true);
  //     Q()
  //     .then(function() {
  //       return Browser.downloadFiles(testDirectory, Browser.defaultCrosswalkVersion);
  //     })
  //     .then(function() {
  //       expect(Browser.getCordovaCrosswalkEngine).toHaveBeenCalledWith(testDirectory);
  //       expect(Browser.downloadCordova40x).toHaveBeenCalledWith(testDirectory);
  //       expect(Browser.getCrosswalkWebviews).toHaveBeenCalledWith(testDirectory, Browser.defaultCrosswalkVersion);
  //     })
  //     .catch(function(error) {
  //       expect('this').toBe('not this');
  //     })
  //     .fin(done);
  //   });
  // });

});
