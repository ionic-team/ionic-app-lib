var fs = require('fs');
var path = require('path');
var log = require('./logging').logger;

var Project = {};

Project.PROJECT_FILE = 'ionic.config.json';
Project.OLD_PROJECT_FILE = 'ionic.project';
Project.OLD_V2_PROJECT_FILE = 'ionic.config.js';
Project.PROJECT_DEFAULT = {
  name: '',
  app_id: '' // eslint-disable-line camelcase
};
Project.data = null;

function wrap(appDirectory, data) {
  return {
    get: function get(key) {
      return get(data, key);
    },
    remove: function remove(key) {
      return remove(data, key);
    },
    set: function set(key, value) {
      return set(data, key, value);
    },
    save: function save() {
      return save(appDirectory, data);
    }
  };
}

function load(appDirectory) {
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
      log.warn(('WARN: ionic.config.js has been deprecated, you can remove it.').yellow);
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
    create(appDirectory, dirname);
    save(appDirectory, data);
  }

  return wrap(appDirectory, data);
}

function create(appDirectory, name) {
  var data = Project.PROJECT_DEFAULT;
  if (name) {
    set(data, 'name', name);
  }

  return wrap(appDirectory, data);
}

function save(appDirectory, data) {
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
}

function get(data, key) {
  if (!data) {
    return null;
  }
  if (key) {
    return data[key];
  } else {
    return data;
  }
}

function set(data, key, value) {
  if (!data) {
    data = Project.PROJECT_DEFAULT;
  }
  data[key] = value;
}

function remove(data, key) {
  if (!data) {
    data = Project.PROJECT_DEFAULT;
  }
  data[key] = '';
}

module.exports = {
  wrap: wrap,
  load: load,
  create: create,
  save: save,
  get: get,
  set: set,
  remove: remove
};
