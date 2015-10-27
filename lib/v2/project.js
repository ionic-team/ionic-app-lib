var fs = require('fs'),
    path = require('path');

var Project = module.exports;

Project.IONIC_DIR = '.ionic';
Project.PROJECT_FILE = 'project.js';
Project.PROJECT_DATA = {
  defaultBrowser: 'chrome',
  proxies: null,
  sassEntryPath: '/www/app/scss',
  sassOutputPath: '/www/build/css',
  sassWatchPattern: ['www/**/*.scss'],
  htmlWatchPattern: ['www/**/*.html']
};

Project.CONFIG_FILE = 'ionic.config.js';
Project.CONFIG_DATA = {};

Project.wrap = function wrap(path, data) {
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
      return Project.save(path, data);
    }
  };
};

Project.loadConfig = function loadConfig(appDirectory) {
  var configPath = path.join(appDirectory, Project.CONFIG_FILE);

  var config = Project.load(configPath, Project.CONFIG_DATA);

  // new project, get name from project directory
  if (!config.name) {
    var pathParts = path.join(appDirectory, '.').split(path.sep);
    var projectName = parts[parts.length-1];
    config.set('name', projectName);
  }

  return config;
}

Project.loadProject = function loadProject(appDirectory) {
  var projectPath = path.join(appDirectory, Project.IONIC_DIR, Project.PROJECT_FILE);
  return Project.load(projectPath, Project.PROJECT_DATA);
}

Project.load = function load(path, defaultData) {
  var file;
  try {
    data = require(path);
  } catch (ex) {
    return Project.save(path, defaultData);
  }

  return Project.wrap(path, data);
}

Project.save = function save(path, data) {
  try {
    var contents = 'module.exports = ' + JSON.stringify(data);
    console.log(path);
    console.log(contents);
    fs.writeFileSync(path, contents);
  } catch(e) {
    console.error('Unable to save Ionic file:', e);
  }

  return Project.wrap(path, data);
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

Project.set = function set(data ,key, value) {
  if (!data) {
    data = Project.PROJECT_DEFAULT;
  }
  data[key] = value;
};

Project.remove = function remove(data, key) {
  if (!data) {
    data = Project.PROJECT_DEFAULT;
  }
  data[key] = '';
};
