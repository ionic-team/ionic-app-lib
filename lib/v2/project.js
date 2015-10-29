var fs = require('fs'),
    path = require('path'),
    shell = require('shelljs');

var Project = module.exports;

Project.IONIC_DIR = '.ionic';
Project.PROJECT_FILE = 'project.js';
Project.PROJECT_DATA = {};

Project.CONFIG_FILE = 'ionic.config.js';
Project.CONFIG_DATA = {
  defaultBrowser: 'chrome',
  proxies: null,
  sassEntryPath: '/www/app/scss',
  sassOutputPath: '/www/build/css',
  sassWatchPattern: ['www/**/*.scss'],
  htmlWatchPattern: ['www/**/*.html']
};

Project.wrap = function wrap(filePath, data) {
  return {
    get: function get(key) {
      return Project.get(data, key);
    },
    remove: function remove(key) {
      return Project.remove(data, key);
    },
    set: function set(key, value) {
      return Project.set(data, key, value);
    },
    save: function save() {
      return Project.save(filePath, data);
    }
  };
};

Project.loadConfig = function loadConfig(appDirectory) {
  if (!appDirectory) return null;

  var configPath = path.join(appDirectory, Project.CONFIG_FILE);

  var config = Project.load(configPath, Project.CONFIG_DATA);

  // new project, get name from project directory
  if (config && !config.get('name')) {
    var pathParts = path.join(appDirectory, '.').split(path.sep);
    var projectName = pathParts[pathParts.length-1];
    config.set('name', projectName);
    //TODO necessary?
    //config.save();
  }

  return config;
}

Project.loadProject = function loadProject(appDirectory) {
  if (!appDirectory) return null;

  var projectPath = path.join(appDirectory, Project.IONIC_DIR, Project.PROJECT_FILE);
  return Project.load(projectPath, Project.PROJECT_DATA);
}

Project.load = function load(filePath, defaultData) {
  var file;
  try {
    data = require(filePath);
  } catch (ex) {
    if (!defaultData) return null;

    return Project.save(filePath, defaultData);
  }

  return Project.wrap(filePath, data);
}

Project.save = function save(filePath, data) {
  if (!data) return null;

  try {
    var contents = 'module.exports = ' + JSON.stringify(data, null, 2);
    fileDir = path.dirname(filePath);
    shell.mkdir('-p', fileDir);
    fs.writeFileSync(filePath, contents);
  } catch(e) {
    console.error('Unable to save Ionic file:', e);
  }

  return Project.wrap(filePath, data);
};

Project.get = function get(data, key) {
  if (!data) {
    return null;
  }
  if (key) {
    return data[key];
  } else {
    return data;
  }
};

Project.set = function set(data, key, value) {
  if (typeof data === 'undefined' || typeof key === 'undefined') return;
  data[key] = value;
};

Project.remove = function remove(data, key) {
  if (!data) {
    data = Project.PROJECT_DEFAULT;
  }
  data[key] = '';
};
