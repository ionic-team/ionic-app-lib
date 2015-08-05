var events = require('../lib/events'),
    fs = require('fs'),
    helpers = require('./helpers'),
    path = require('path'),
    Project = require('../lib/project'),
    logging = require('../lib/logging');

logging.logger = helpers.testingLogger;

var testDir = '/ionic/project';

var spyOnFileSystem = function(data) {
  data = data ? JSON.stringify(data) : JSON.stringify(Project.PROJECT_DEFAULT);
  spyOn(fs, 'existsSync').andReturn(true);
  spyOn(fs, 'readFileSync').andReturn(data);
};

describe('Project', function() {
  var data = Project.PROJECT_DEFAULT;

  beforeEach(function() {
    spyOnFileSystem(data);
  });  

  it('should have Project defined', function() {
    expect(Project).toBeDefined();
  });

  describe('#create', function() {
    it('should create a default project file', function() {
      spyOn(Project, 'set').andCallThrough();
      spyOn(Project, 'wrap').andCallThrough();
      var project = Project.create(testDir, 'test');
      expect(Project.set).toHaveBeenCalledWith(data, 'name', 'test');
      expect(Project.wrap).toHaveBeenCalledWith(testDir, data);

      expect(Project.get(data, 'name')).toBe('test');
    });
  });

  describe('#wrap', function() {
    var project = null;

    beforeEach(function() {
      project = Project.wrap(testDir, data);
    });

    it('should wrap the methods correctly', function() {
      expect(project).toBeDefined();
      expect(project.get).toBeDefined();
      expect(project.remove).toBeDefined();
      expect(project.set).toBeDefined();
      expect(project.save).toBeDefined();
    });

    it('should call Project.get from wrapped object', function() {
      spyOn(Project, 'get').andCallThrough();
      var appId = project.get('app_id');

      expect(appId).toBe(data.app_id);
      expect(Project.get).toHaveBeenCalledWith(data, 'app_id');
    });

    it('should call Project.set from wrapped object', function() {
      spyOn(Project, 'set').andCallThrough();
      project.set('app_id', 'uid');

      expect(Project.set).toHaveBeenCalledWith(data, 'app_id', 'uid');

      var appId = project.get('app_id');

      expect(appId).toBe('uid');
    });

    it('should call Project.remove from wrapped object', function() {
      spyOn(Project, 'remove').andCallThrough();
      project.set('app_id', 'uid');
      expect(project.get('app_id')).toBe('uid');
      project.remove('app_id');
      expect(Project.remove).toHaveBeenCalledWith(data, 'app_id');
      expect(project.get('app_id')).toBe('');
    });

    it('should call Project.save from wrapped object', function() {
      spyOn(Project, 'save');
      project.set('app_id', 'uid');

      project.save();

      expect(Project.save).toHaveBeenCalledWith(testDir, data);
    });

  });

  describe('#load', function() {

    it('should default to cwd if no app directory passed', function() {
      var project = Project.load();
      expect(project).toBeDefined();
    });

    it('should wrap the project object with app directory and data', function() {
      spyOn(Project, 'wrap').andCallThrough();
      var project = Project.load(testDir);
      expect(Project.wrap).toHaveBeenCalledWith(testDir, data);
    });

    it('should load a base ionic.project file that exists', function() {
      var project = Project.load(testDir);
      expect(fs.existsSync).toHaveBeenCalledWith(path.join(testDir, Project.PROJECT_FILE));
      expect(fs.readFileSync).toHaveBeenCalledWith(path.join(testDir, Project.PROJECT_FILE));
    });
  });

});
