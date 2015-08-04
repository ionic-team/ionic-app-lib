var Browser = require('../lib/browser'),
    fs = require('fs'),
    helpers = require('./helpers'),
    info = require('../lib/info'),
    shelljs = require('shelljs'),
    Q = require('q'),
    logging = require('../lib/logging');

// spyOn(shelljs)
logging.logger = helpers.testingLogger;

var setCordovaVersion = function setCordovaVersion(version) {
  return function() {
      var fakeInfo = {
      cordova: version
    };
    spyOn(info, 'gatherInfo').andReturn(fakeInfo);
  }
};

describe('Browser', function() {

  var testDirectory = '/some/fake/directory';

  beforeEach(function() {
    spyOn(Browser, 'saveBrowserInstallation');
  })

  it('should have Browser defined', function() {
    expect(Browser).toBeDefined();
  });

  describe('#addBrowser pre 5.0', function() {

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
      spyOn(logging.logger, 'info');
      Q()
      .then(function() {
        return Browser.addBrowser(testDirectory, 'default');
      })
      .then(function(){
        // expect(Browser.installDefaultBrowser).toHaveBeenCalledWith(testDirectory);
        expect(logging.logger.info).toHaveBeenCalledWith('No accepted browser was specified.'.red.bold);
      })
      .catch(function(ex){
        expect('this').toBe('not this');
      })
      .fin(done);
    });

  });

  describe('#installCrosswalk', function() {
    describe('pre Cordova CLI 5.0', function() {
      beforeEach(setCordovaVersion('4.3.0'));

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

    describe('post Cordova CLI 5.0', function() {
      describe('CLI 5.0.0', function() {
        beforeEach(setCordovaVersion('5.0.0'));

        it('should call raw cordova commands', function() {
          spyOn(Browser, 'installCordovaCrosswalk');
          Browser.installCrosswalk(testDirectory, Browser.defaultCrosswalkVersion, true, false);
          expect(Browser.installCordovaCrosswalk).toHaveBeenCalledWith(testDirectory);
        });
      });
      describe('CLI 5.1+', function() {
        beforeEach(setCordovaVersion('5.1.1'));

        it('should call raw cordova commands', function() {
          spyOn(Browser, 'installCordovaCrosswalk');
          Browser.installCrosswalk(testDirectory, Browser.defaultCrosswalkVersion, true, false);
          expect(Browser.installCordovaCrosswalk).toHaveBeenCalledWith(testDirectory);
        });
      });
    });
  });

  describe('#downloadFiles', function() {
    it('should call methods correctly to download required crosswalk files', function(done) {
      spyOn(Browser, 'downloadCordovaCrosswalkEngine').andReturn(Q());
      spyOn(Browser, 'downloadCordova40x').andReturn(Q());
      spyOn(Browser, 'downloadCrosswalkWebviews').andReturn(Q());

      Q()
      .then(function() {
        return Browser.downloadFiles(testDirectory, Browser.defaultCrosswalkVersion, false);
      })
      .then(function() {
        expect(Browser.downloadCordovaCrosswalkEngine).toHaveBeenCalledWith(testDirectory);
        // expect(Browser.downloadCordova40x).toHaveBeenCalledWith(testDirectory);
        expect(Browser.downloadCrosswalkWebviews).toHaveBeenCalledWith(testDirectory, Browser.defaultCrosswalkVersion, false);
      })
      .catch(function(error) {
        console.log('error', error, error.stack)
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });

  describe('#upgradeCrosswalk', function(){
    it('should call clean before upgrading', function() {
      spyOn(Browser, 'clean');
      spyOn(Browser, 'installCrosswalk');

      Browser.upgradeCrosswalk(testDirectory);

      expect(Browser.clean).toHaveBeenCalledWith(testDirectory);
      expect(Browser.installCrosswalk).toHaveBeenCalledWith(testDirectory, Browser.defaultCrosswalkVersion);
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

  describe('#removeBrowser', function() {
    it('should call removeCrosswalk with directory', function() {
      spyOn(Browser, 'removeCrosswalk');
      spyOn(Browser, 'removeBrowserInstallation');
      Browser.removeBrowser(testDirectory, 'crosswalk');
      expect(Browser.removeCrosswalk).toHaveBeenCalledWith(testDirectory);
      expect(Browser.removeBrowserInstallation).toHaveBeenCalledWith(testDirectory, 'crosswalk');
    });

    it('should log a message to specify browser if none specified', function() {
      spyOn(logging.logger, 'warn');
      spyOn(Browser, 'removeCrosswalk');
      Browser.removeBrowser(testDirectory);
      expect(logging.logger.warn).toHaveBeenCalledWith('Please specify a browser to be removed');
      expect(Browser.removeCrosswalk).not.toHaveBeenCalled();
    });
  });

});
