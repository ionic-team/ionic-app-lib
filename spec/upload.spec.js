var archiver = require('archiver'),
    events = require('../lib/events'),
    fs = require('fs'),
    helpers = require('./helpers'),
    IoLib = require('../lib/io-config'),
    path = require('path'),
    Project = require('../lib/project'),
    Q = require('q'),
    rewire = require('rewire'),
    settings = require('../lib/settings'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

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
    expect(Upload.doUpload).toBeDefined();
    expect(Upload.addCacheBusters).toBeDefined();
    expect(Upload.removeCacheBusters).toBeDefined();
    expect(Upload.getDirectUploadKey).toBeDefined();
    expect(Upload.signalDashUpload).toBeDefined();
    expect(Upload.uploadToS3).toBeDefined();
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

        //Fix for https://github.com/driftyco/ionic-cli/issues/452
        var bomIndex = indexHtml.indexOf('&#xFEFF;');
        expect(bomIndex).toBe(-1);

        //Fix for https://github.com/driftyco/ionic-cli/issues/452#issuecomment-117376542
        var aposIndex = indexHtml.indexOf("goToState('dash')");
        expect(aposIndex).not.toBe(-1);
      })
      .catch(function(ex){
        expect('this').toBe(ex.stack);
      })
      .fin(done);
    });

    it('should add ionic cache buster attributes with bom', function(done) {
      //Fix for https://github.com/driftyco/ionic-cli/issues/452
      var indexPath = path.join(__dirname, 'bomindex.html');
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

        //Fix for https://github.com/driftyco/ionic-cli/issues/452
        var bomIndex = indexHtml.indexOf('&#xFEFF;');
        expect(bomIndex).toBe(-1);
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

        //Fix for https://github.com/driftyco/ionic-cli/issues/504
        var queryStringIndex = indexHtml.indexOf('http://jsconsole.com/remote.js?some-id-here=');
        expect(queryStringIndex).toBe(-1);
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
        Upload.getDirectUploadKey
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

  describe('#doUpload', function() {
    var project,
        key;
    beforeEach(function() {
      project = Project.wrap(Project.PROJECT_DEFAULT);
      key = {
        app_id: Project.PROJECT_DEFAULT.app_id
      };
      spyOn(Project, 'load').andReturn(project);
      spyOn(IoLib, 'writeIoConfig').andReturn(Q(key));
    });

    it('should call appropriate methods for upload process', function(done) {
      var jar = {};
      spyOn(Upload, 'addCacheBusters').andReturn(Q());
      spyOn(Upload, 'zipContents').andReturn(Q());
      spyOn(Upload, 'removeCacheBusters').andReturn(Q());
      spyOn(Upload, 'getDirectUploadKey').andReturn(Q(key));
      spyOn(Project, 'set');
      spyOn(Project, 'save');
      spyOn(Upload, 'uploadToS3').andReturn(Q());
      spyOn(Upload, 'signalDashUpload').andReturn(Q());

      var note = 'Note';

      Q()
      .then(function(){
        return Upload.doUpload(testDir, jar, note);
      })
      .then(function(){
        var indexPath = path.join(testDir, 'www', 'index.html');
        expect(Upload.addCacheBusters).toHaveBeenCalledWith(indexPath);
        expect(Upload.zipContents).toHaveBeenCalledWith(testDir, 'www');
        expect(Upload.removeCacheBusters).toHaveBeenCalledWith(indexPath);
        expect(Upload.getDirectUploadKey).toHaveBeenCalledWith(project, jar, note);
        expect(IoLib.writeIoConfig).toHaveBeenCalledWith('app_id', key.app_id, true);
        expect(Upload.uploadToS3).toHaveBeenCalledWith(testDir, key);
        expect(Upload.signalDashUpload).toHaveBeenCalledWith(project, jar);
      })
      .catch(function(ex) {
        expect('this').toBe(ex.stack);
      })
      .fin(done);

    });
  });

  describe('#uploadToS3', function() {
    it('should call request to signal upload to s3', function(done) {
      var requestSpy = createSpy();
      var fs = require('fs');
      var q = require('q');
      var deferred = q.defer();

      spyOn(q, 'defer').andReturn(deferred);
      spyOn(fs, 'readFileSync');
      Upload.__set__('request', requestSpy);
      Q()
      .then(function(){
        Upload.uploadToS3(testDir, {});
        return deferred.resolve(true);
      })
      .then(function() {
        expect(requestSpy).toHaveBeenCalled();
        expect(fs.readFileSync).toHaveBeenCalled();
      })
      .catch(function(ex){
        console.log(ex);
        expect('this').toBe(ex.stack);
      })
      .fin(done);
    });
  });

});
