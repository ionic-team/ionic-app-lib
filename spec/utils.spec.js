var fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    archiver = require('archiver'),
    rewire = require('rewire'),
    helpers = require('./helpers'),
    Info = require('../lib/info'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

var testDir = '/ionic/app';

describe('Utils', function() {

  var Utils;

  beforeEach(function() {
    Utils = rewire('../lib/utils');
  });

  it('should have methods defined', function() {
    var methods = ['transformCookies', 'retrieveCsrfToken', 'createArchive', 'fetchArchive', 'preprocessOptions', 'getContentSrc', 'fail'];
    methods.forEach(function(method) {
      expect(Utils[method]).toBeDefined();
    })
  })

  describe('#transformCookies', function() {
    it('should check for valid cookie jar', function() {
      expect(function() {
        Utils.transformCookies(null);
      }).toThrow('You parse out cookies if they are null')
    })
  })

  describe('#createArchive', function() {
    it('should zip the contents and resolve', function(done) {
      spyOn(fs, 'existsSync').andReturn(true);
      var emitter = new (require('events').EventEmitter)();
      spyOn(fs, 'createWriteStream').andReturn(emitter);

      var archiveSpy = createSpyObj('archive', ['pipe', 'bulk', 'finalize']);

      var archiverFake = function() {
        return archiveSpy;
      };

      Utils.__set__('archiver', archiverFake);

      Q()
      .then(function(){
        // Trigger this so it will finish.
        setTimeout(function(){
          emitter.emit('close', '');
        }, 50);

        return Utils.createArchive(testDir, 'www');
      })
      .then(function() {
        // expect()
        expect(archiveSpy.pipe).toHaveBeenCalledWith(emitter);
        var bulkProps = [{ expand: true, cwd: path.join(testDir, 'www'), src: ['**'] }];
        expect(archiveSpy.bulk).toHaveBeenCalledWith(bulkProps);
        expect(archiveSpy.finalize).toHaveBeenCalled();
      })
      .catch(function(ex){
        expect('this').toBe(ex.stack);
      })
      .fin(done);
    });
  });

  describe('#isIonicV2', function() {
    it('should return false for a v1 project', function() {
      spyOn(Info, 'getIonicVersion').andCallFake(function(info, appDirectory) {
        info.ionic = '1.1.0';
      });

      var isIonicV2 = Utils.isIonicV2('/fake/ionic/appDirectory');
      expect(isIonicV2).toBe(false);

    });

    it('should return false for a v1 project', function() {
      spyOn(Info, 'getIonicVersion').andCallFake(function(info, appDirectory) {
        info.ionic = '2.0.0-alpha.15';
      });

      var isIonicV2 = Utils.isIonicV2('/fake/ionic/appDirectory');
      expect(isIonicV2).toBe(true);

    });
  });

});
