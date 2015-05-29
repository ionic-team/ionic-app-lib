var archiver = require('archiver'),
    events = require('../lib/events'),
    fs = require('fs'),
    helpers = require('./helpers'),
    path = require('path'),
    Project = require('../lib/project'),
    Q = require('q'),
    rewire = require('rewire'),
    settings = require('../lib/settings');

var testDir = '/ionic/app';

describe('Upload', function() {

  var Upload;

  beforeEach(function() {
    //Need to reset the Upload instance everytime incase
    //we dont want to rewire something for another test.
    Upload = rewire('../lib/upload');

  });

  it('should have Upload defined', function() {
    expect(Upload).toBeDefined();

    expect(Upload.zipContents).toBeDefined();
    expect(Upload.uploadZipContents).toBeDefined();
    expect(Upload.doUpload).toBeDefined();
    expect(Upload.addCacheBusters).toBeDefined();
    expect(Upload.removeCacheBusters).toBeDefined();

  });

  describe('#addCacheBusters', function() {
    beforeEach(function(){
      spyOn(fs, 'writeFileSync');
    });

    it('should add ionic cache buster attributes', function(done) {
      var indexPath = path.join(__dirname, 'index.html');
      spyOn(Math, 'floor').andReturn(5555);

      Q()
      .then(function(){
        return Upload.addCacheBusters(indexPath);
      })
      .then(function() {
        var argsPassed = fs.writeFileSync.argsForCall[0];
        // console.log('args:', argsPassed);
        //Here we check if the html to be saved has the cachebuster flags.
        var indexHtml = argsPassed[1];
        var indexOfCacheBusters = indexHtml.indexOf('?ionicCachebuster=5555');
        expect(indexOfCacheBusters).not.toBe(-1);

        //Fix for https://github.com/driftyco/ionic-cli/issues/435
        var indexOfHashUrl = indexHtml.indexOf('asset.js?ionicCachebuster=5555#hash');
        expect(indexOfHashUrl).not.toBe(-1);
      })
      .catch(function(ex){
        expect('this').toBe(ex.stack);
      })
      .fin(done);
    })
  });

  describe('#removeCacheBusters', function() {
    beforeEach(function(){
      spyOn(fs, 'writeFileSync');
    });

    it('should remove ionic cache buster attributes', function(done) {
      var indexPath = path.join(__dirname, 'cachebustedindex.html');

      Q()
      .then(function(){
        return Upload.removeCacheBusters(indexPath);
      })
      .then(function() {
        var argsPassed = fs.writeFileSync.argsForCall[0];
        var indexHtml = argsPassed[1];

        var indexOfCacheBusters = indexHtml.indexOf('?ionicCachebuster=5555');
        expect(indexOfCacheBusters).toBe(-1);

        var indexOfHashUrl = indexHtml.indexOf('asset.js?ionicCachebuster=5555#hash');
        expect(indexOfHashUrl).toBe(-1);
      })
      .catch(function(ex){
        expect('this').toBe(ex.stack);
      })
      .fin(done);
    });
  });

  describe('#zipContents', function() {
    it('should zip the contents and resolve', function(done) {
      var archiveSpy = createSpyObj('archive', ['pipe', 'bulk', 'finalize']);

      var archiverFake = function() {
        return archiveSpy;
      };

      Upload.__set__('archiver', archiverFake);

      spyOn(fs, 'existsSync').andReturn(true);
      var emitter = new (require('events').EventEmitter)();
      spyOn(fs, 'createWriteStream').andReturn(emitter);

      Q()
      .then(function(){
        //Trigger this so it will finish.      
        setTimeout(function(){
          emitter.emit('close', '');
        }, 50);

        return Upload.zipContents(testDir, 'www');
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

  describe('#getDirectUploadKey', function() {
    it('should do a PUT request to the server', function(done) {
      Q()
      .then(function(){
        //do function call
      })
      .then(function() {
        //do expectations
      })
      .catch(function(ex){
        expect('this').toBe(ex.stack);
      })
      .fin(done);
    })
  });

  xdescribe('#doUpload', function() {
    beforeEach(function() {
      spyOn(Project, 'load').andReturn(Project.wrap(Project.PROJECT_DEFAULT));
    });

    it('should call appropriate methods for upload process', function(done) {
      Q()
      .then(function(){
        return Upload.doUpload(testDir);
      })
      .then(function(){
        var indexPath = path.join(testDir, 'www', 'index.html');
        expect(Upload.zipContents).toHaveBeenCalledWith(testDir);
        expect(Upload.addCacheBusters).toHaveBeenCalledWith(indexPath);
        expect(Upload.getDirectUploadKey).toHaveBeenCalledWith();
        expect(Upload.uploadToS3).toHaveBeenCalledWith();
        expect(Upload.signalDashUpload).toHaveBeenCalledWith();
        expect(Upload.removeCacheBusters).toHaveBeenCalledWith(indexPath);
      })
      .catch(function(ex) {
        expect('this').toBe(ex.stack);
      })
      .fin(done);
    });
  });

});
