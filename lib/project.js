var fs = require('fs');
var path = require('path');
var log = require('./logging').logger;
var chalk = require('chalk');

var Project = module.exports;

Project.PROJECT_FILE = 'ionic.config.json';
Project.OLD_PROJECT_FILE = 'ionic.project';
Project.OLD_V2_PROJECT_FILE = 'ionic.config.js';
Project.PROJECT_DEFAULT = {
  name: '',
  app_id: '' // eslint-disable-line camelcase
};
Project.data = null;

Project.wrap = function wrap(appDirectory, data) {
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
      return Project.save(appDirectory, data);
    }
  };
};

Project.load = function load(appDirectory) {
  if (!appDirectory) {

    // Try to grab cwd
    appDirectory = process.cwd();
  }

  var projectFile = path.join(appDirectory, Project.PROJECT_FILE);
  var oldProjectFile = path.join(appDirectory, Project.OLD_PROJECT_FILE);
  var oldV2ProjectFile = path.join(appDirectory, Project.OLD_V2_PROJECT_FILE);
  var data;
  var found;

  try {
    data = JSON.parse(fs.readFileSync(projectFile));
    found = true;
    if (fs.existsSync(oldV2ProjectFile)) {
      log.warn(chalk.yellow('WARN: ionic.config.js has been deprecated, you can remove it.'));
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      log.error('Uh oh! There\'s a syntax error in your ' + Project.PROJECT_FILE + ' file:\n' + e.stack);
      process.exit(1);
    }
  }
  if (!found) {
    try {
      data = JSON.parse(fs.readFileSync(oldProjectFile));
      log.warn('WARN: ionic.project has been renamed to ' + Project.PROJECT_FILE + ', please rename it.');
      found = true;
    } catch (e) {
      if (e instanceof SyntaxError) {
        log.error('Uh oh! There\'s a syntax error in your ionic.project file:\n' + e.stack);
        process.exit(1);
      }
    }
  }
  if (!found) {
    data = Project.PROJECT_DEFAULT;
    if (fs.existsSync(oldV2ProjectFile)) {
      log.warn('WARN: ionic.config.js has been deprecated in favor of ionic.config.json.');
      log.info('Creating default ionic.config.json for you now...\n');
      data.v2 = true;
      if (fs.existsSync('tsconfig.json')) {
        data.typescript = true;
      }
    }
    var parts = path.join(appDirectory, '.').split(path.sep);
    var dirname = parts[parts.length - 1];
    Project.create(appDirectory, dirname);
    Project.save(appDirectory, data);
  }

  return Project.wrap(appDirectory, data);
};

Project.create = function create(appDirectory, name) {
  var data = Project.PROJECT_DEFAULT;
  if (name) {
    Project.set(data, 'name', name);
  }

  return Project.wrap(appDirectory, data);
};

Project.save = function save(appDirectory, data) {
  if (!data) {
    throw new Error('No data passed to Project.save');
  }

  try {
    var filePath = path.join(appDirectory, Project.PROJECT_FILE);
    var jsonData = JSON.stringify(data, null, 2);

    fs.writeFileSync(filePath, jsonData + '\n');
  } catch (e) {
    log.error('Unable to save settings file:', e);
  }
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
