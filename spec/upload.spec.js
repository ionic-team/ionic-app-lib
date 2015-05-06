var archiver = require('archiver'),
    events = require('../lib/events'),
    fs = require('fs'),
    helpers = require('./helpers'),
    Upload = require('../lib/upload');

ddescribe('Upload', function() {

  it('should have Upload defined', function() {
    expect(Upload).toBeDefined();
    expect(Upload.ZipContents).toBeDefined();
    expect(Upload.UploadZipContents).toBeDefined();
  });

  it('should create a zip file', function(){
    spyOn()
  });

});
