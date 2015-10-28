var fs = require('fs'),
    helpers = require('../helpers'),
    path = require('path'),
    Project = require('../../lib/v2/project'),
    shell = require('shelljs'),
    logging = require('../../lib/logging');

logging.logger = helpers.testingLogger;

describe('Project', function() {
  var tmpDir = helpers.tmpDir('v2_project_test/TestApp/');

  afterEach(function(){
    // cleanup for each test
    shell.rm('-rf', tmpDir);
    tmpDir = helpers.tmpDir('v2_project_test/TestApp/');
  })

  it('should have Project defined', function() {
    expect(Project).toBeDefined();
  });

  describe('#load', function(){
    it('should return null if !defaultData and filePath does not exist', function(){
       spyOn(Project, 'save');
      var filePath = tmpDir + 'fake/path.js';

      expect(Project.load(filePath)).toBe(null);
      expect(Project.save).not.toHaveBeenCalled();
    });

    it('should call Project.save if defaultData is defined and filePath does not exist', function(){
       spyOn(Project, 'save');
       var filePath = tmpDir + 'fake/path.js';
       var obj = {};

       Project.load(filePath, obj);

       expect(Project.save).toHaveBeenCalledWith(filePath, obj);
    });

    it('should require filePath if filePath exists', function(){
       spyOn(Project, 'save');
       var fakeFilePath = tmpDir + 'load-test.js';
       fs.writeFileSync(fakeFilePath, 'module.exports = { test: "test" }');

       var fileData = Project.load(fakeFilePath);

       expect(fileData.get('test')).toBe('test');
       expect(Project.save).not.toHaveBeenCalled();
       expect(require.cache[require.resolve(fakeFilePath)]).toBeDefined();
    });
  });

  describe('#save', function(){
    it('should return null if !data', function(){
      expect(Project.save()).toBe(null);
    });

    it('should write data to filePath', function(){
      spyOn(fs, 'writeFileSync').andCallThrough();
      var fakeFilePath = tmpDir + 'fake/path/config.js';

      Project.save(fakeFilePath, { test: 'test' });
      expect(fs.writeFileSync).toHaveBeenCalled();

      requireData = require(fakeFilePath);
      expect(requireData.test).toBe(data.test);

      delete require.cache[require.resolve(fakeFilePath)];
    })
  });

  describe('#loadConfig', function(){
    beforeEach(function(){
      Project.CONFIG_DATA = { test: 'test' };
    });

    it('should return null if !appDirectory', function(){
      expect(Project.loadConfig()).toBe(null);
    });

    it('should call Project.load with the proper path and data', function(){
      spyOn(Project, 'load');
      var configPath = path.join(tmpDir, Project.CONFIG_FILE);
      Project.loadConfig(tmpDir);
      expect(Project.load).toHaveBeenCalledWith(configPath, Project.CONFIG_DATA);
    });

    it('should add a name property to config if it is not present', function(){
      var config = Project.CONFIG_DATA;
      expect(config.name).toBeUndefined();
      Project.loadConfig(tmpDir);
      expect(config.name).toBe('TestApp');
    });

    it('should not add a name property to config if it is present', function(){
      var config = Project.CONFIG_DATA;
      config.name = 'name';
      Project.loadConfig(tmpDir);
      expect(config.name).toBe('name');
    });
  });

  describe('#loadProject', function(){
    beforeEach(function(){
      Project.PROJECT_DATA = { test: 'test' };
    });

    it('should return null if !appDirectory', function(){
      expect(Project.loadProject()).toBe(null);
    });

    it('should call Project.load with the proper path and data', function(){
      spyOn(Project, 'load');
      var projectPath = path.join(tmpDir, Project.IONIC_DIR, Project.PROJECT_FILE);
      Project.loadProject(tmpDir);
      expect(Project.load).toHaveBeenCalledWith(projectPath, Project.PROJECT_DATA);
    });
  })
});
