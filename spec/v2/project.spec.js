var fs = require('fs'),
    helpers = require('../helpers'),
    path = require('path'),
    Project = require('../../lib/v2/project'),
    shell = require('shelljs'),
    logging = require('../../lib/logging');

logging.logger = helpers.testingLogger;

// var spyOnFileSystem = function(data) {
//   data = data ? JSON.stringify(data) : JSON.stringify(Project.PROJECT_DEFAULT);
//   spyOn(fs, 'existsSync').andReturn(true);
//   spyOn(fs, 'readFileSync').andReturn(data);
// };

describe('Project', function() {
  var appName = 'TestIonic';
  var tmpDir, appDirectory;
  var data = Project.PROJECT_DEFAULT;

  beforeEach(function(){
    // reset for each test
    tmpDir = helpers.tmpDir('create_test');
    appDirectory = path.join(tmpDir, appName);
  })

  it('should have Project defined', function() {
    expect(Project).toBeDefined();
  });

  ddescribe('#load', function(){

    it('should call Project.save if the load path does not exist', function(){
       spyOn(Project, 'save');
       Project.load(tmpDir + 'fakePath');
       expect(Project.save).toHaveBeenCalled();
    });

    it('should save the provided data if the load path does not exist', function(){
       var fakeData = { test: 'test' };
       var loadData = Project.load(tmpDir + 'fakePath2', fakeData);
       expect(loadData.get('test')).toBe(fakeData.test);
    });

    it('should require the path if it exists', function(){
       var fakeFilePath = tmpDir + 'fakeFile.js';
       fs.writeFileSync(fakeFilePath, 'module.exports = { test: "test" }');
       var fileData = Project.load(fakeFilePath);
       expect(fileData.get('test')).toBe('test');
    });
  });

  // ddescribe('#save', function() {
  //   iit('should create the specified file if it doesn\'t exist', function() {
  //     var project = Project.save(, 'test');
  //     expect(project.get('name')).toBe('test');
  //     expect(project.get('defaultBrowser'), 'chrome');
  //     expect(project.get('defaultBrowser'), 'chrome');
  //     expect(project.get('proxies'), null);
  //     expect(project.get('sassEntryPath'), '/www/app/scss');
  //     expect(project.get('sassOutputPath'), '/www/build/css');
  //     expect(project.get('sassWatchPattern'), ['www/**/*.scss']);
  //     expect(project.get('htmlWatchPattern'), ['www/**/*.html']);
  //   });
  //
  //   it('should save the configuration', function() {
  //     spyOn(fs, 'mkdirSync'); //mock out the creation of mkdirSync for project folder
  //     spyOn(fs, 'writeFileSync'); // mock out writing file
  //     Project.save(testDir, Project.PROJECT_DEFAULT);
  //
  //     var projectFileDir = path.join(testDir, Project.PROJECT_FILE_DIR);
  //     var projectFilePath = path.join(testDir, Project.PROJECT_FILE_DIR, Project.PROJECT_FILE);
  //     var projectContents = 'module.exports = ' + JSON.stringify(Project.PROJECT_DEFAULT);
  //
  //     expect(fs.mkdirSync).toHaveBeenCalledWith(projectFileDir);
  //     expect(fs.writeFileSync).toHaveBeenCalledWith(projectFilePath, projectContents)
  //   });
  // });
  //
  // describe('#load', function() {
  //   var projectFile;
  //
  //   beforeEach(function() {
  //     //Create the test project file
  //     shell.rm('-rf', projectDir);
  //     shell.mkdir('-p', tmpDir);
  //     shell.mkdir('-p', projectDir);
  //     projectFile = Project.create(projectDir, 'test');
  //     projectFile.save();
  //   });
  //
  //   it('should load a saved file', function() {
  //     var project = Project.load(projectDir);
  //     expect(projectFile.get('name')).toBe(project.get('name'));
  //     expect(projectFile.get('sassEntryPath')).toBe(project.get('sassEntryPath'));
  //   });
  // })

  // describe('#wrap', function() {
  //   var project = null;

  //   beforeEach(function() {
  //     project = Project.wrap(testDir, data);
  //   });

  //   it('should wrap the methods correctly', function() {
  //     expect(project).toBeDefined();
  //     expect(project.get).toBeDefined();
  //     expect(project.remove).toBeDefined();
  //     expect(project.set).toBeDefined();
  //     expect(project.save).toBeDefined();
  //   });

  //   it('should call Project.get from wrapped object', function() {
  //     spyOn(Project, 'get').andCallThrough();
  //     var appId = project.get('app_id');

  //     expect(appId).toBe(data.app_id);
  //     expect(Project.get).toHaveBeenCalledWith(data, 'app_id');
  //   });

  //   it('should call Project.set from wrapped object', function() {
  //     spyOn(Project, 'set').andCallThrough();
  //     project.set('app_id', 'uid');

  //     expect(Project.set).toHaveBeenCalledWith(data, 'app_id', 'uid');

  //     var appId = project.get('app_id');

  //     expect(appId).toBe('uid');
  //   });

  //   it('should call Project.remove from wrapped object', function() {
  //     spyOn(Project, 'remove').andCallThrough();
  //     project.set('app_id', 'uid');
  //     expect(project.get('app_id')).toBe('uid');
  //     project.remove('app_id');
  //     expect(Project.remove).toHaveBeenCalledWith(data, 'app_id');
  //     expect(project.get('app_id')).toBe('');
  //   });

  //   it('should call Project.save from wrapped object', function() {
  //     spyOn(Project, 'save');
  //     project.set('app_id', 'uid');

  //     project.save();

  //     expect(Project.save).toHaveBeenCalledWith(testDir, data);
  //   });

  // });

  // describe('#load', function() {

  //   it('should default to cwd if no app directory passed', function() {
  //     var project = Project.load();
  //     expect(project).toBeDefined();
  //   });

  //   it('should wrap the project object with app directory and data', function() {
  //     spyOn(Project, 'wrap').andCallThrough();
  //     var project = Project.load(testDir);
  //     expect(Project.wrap).toHaveBeenCalledWith(testDir, data);
  //   });

  //   it('should load a base ionic.project file that exists', function() {
  //     var project = Project.load(testDir);
  //     expect(fs.existsSync).toHaveBeenCalledWith(path.join(testDir, Project.PROJECT_FILE));
  //     expect(fs.readFileSync).toHaveBeenCalledWith(path.join(testDir, Project.PROJECT_FILE));
  //   });
  // });

});
