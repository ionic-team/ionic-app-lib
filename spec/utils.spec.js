var fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    archiver = require('archiver'),
    rewire = require('rewire'),
    helpers = require('./helpers'),
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

});
