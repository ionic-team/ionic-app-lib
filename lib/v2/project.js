var fs = require('fs'),
    path = require('path');

var Project = module.exports;

Project.PROJECT_FILE_DIR = '.ionic';
Project.PROJECT_FILE = 'project.js';
Project.CONFIG_FILE = 'ionic.config.js';
Project.PROJECT_DEFAULT = {
  defaultBrowser: 'chrome',
  proxies: null,
  sassEntryPath: '/www/app/scss',
  sassOutputPath: '/www/build/css',
  sassWatchPattern: ['www/**/*.scss'],
  htmlWatchPattern: ['www/**/*.html']
};

// Project.PROJECT_DEFAULT = {
//   name: '',
//   app_id: ''
// };
// Project.PROJECT_FILE = 'ionic.project';
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

Project.loadV2 = function loadV2(appDirectory) {
  if (!appDirectory) { 
    //Try to grab cwd
    appDirectory = process.cwd();
  }
  var projectPath = path.join(appDirectory, Project.V2_PROJECT_FILE_DIR, Project.V2_PROJECT_FILE);
  var data, project;
  try {
    project = require(projectPath);
  } catch (ex) {
    var parts = path.join(appDirectory, '.').split(path.sep);
    var dirname = parts[parts.length-1];
    Project.createV2(appDirectory, dirname);
    Project.save(appDirectory, Project.V2_PROJECT_DEFAULT);
  }

  var configPath = path.join(appDirectory, Project.V2_CONFIG_FILE);
  var config;
  try {
    config = require(configPath);
  } catch (ex) {
    var parts = path.join(appDirectory, '.').split(path.sep);
    var dirname = parts[parts.length-1];
    Project.createV2(appDirectory, dirname);
    Project.save(appDirectory, Project.V2_PROJECT_DEFAULT);
  }


  return Project.wrap(appDirectory, project);
}

Project.create = function create(appDirectory, name){
  var file = path.join(appDirectory, Project.PROJECT_FILE);
  var data = Project.PROJECT_DEFAULT;
  
  //TODO: check for hidden dir
  //create if not
  try{
    var stats = fs.statSync(path.join(appDirectory, Project.PROJECT_FILE_DIR));
  } catch (ex) {
    if ( ex.errno === -2 ) {
      fs.mkdirSync(path.join(appDirectory, Project.PROJECT_FILE_DIR));
    }
  }

  if (name) {
    Project.set(data, 'name', name);
  }
  // return this;
  return Project.wrap(appDirectory, data);
}

Project.load = function load(appDirectory) {
  if (!appDirectory) { 
    //Try to grab cwd
    appDirectory = process.cwd();
  }
  var file = path.join(appDirectory, Project.PROJECT_FILE_DIR, Project.PROJECT_FILE);
  var data;
  if (fs.existsSync(file)) {
    try {
      data = require(file);
    } catch(ex) {
      throw new Error('There was an error loading your ionic.project file: ' + ex.message);
    }
  } else if (fs.existsSync(path.join(appDirectory, 'www'))) {
    var data = Project.PROJECT_DEFAULT;
    var parts = path.join(appDirectory, '.').split(path.sep);
    var dirname = parts[parts.length-1];
    Project.create(appDirectory, dirname);
    Project.save(appDirectory, data);
  } else {
    throw new Error('Unable to locate the ionic.project file. Are you in your project directory?');
  }
  return Project.wrap(appDirectory, data);
};

// Project.create = function create(appDirectory, name) {
//   var file = path.join(appDirectory, Project.V2_PROJECT_FILE_DIR, Project.V2_PROJECT_FILE);
//   var data = Project.PROJECT_DEFAULT;
  
//   //TODO: check for hidden dir
//   //create if not
//   try{
//     var stats = fs.statsSync(path.join(appDirectory, PROJECT_FILE_DIR));
//   } catch (ex) {
//     console.log(ex);
//     if ( ex.errno === -2 ) {
//       fs.createDirSync(path.join(appDirectory, Project.PROJECT_FILE_DIR));
//     }
//   }

//   if (name) {
//     Project.set(data, 'name', name);
//   }
//   // return this;
//   return Project.wrap(appDirectory, data);
// };

Project.save = function save(appDirectory, data) {
  if (!data) {
    console.trace();
    console.error('This should never happen!');
  }

  //TODO check that project dir exists
  try {
    var stat = fs.statSync(appDirectory, Project.PROJECT_FILE_DIR);
  } catch (ex) {
    fs.mkdirSync(path.join(appDirectory, Project.PROJECT_FILE_DIR));
  }

  try {
    var filePath = path.join(appDirectory, Project.PROJECT_FILE_DIR, Project.PROJECT_FILE);
    var fileContents = 'module.exports = ' + JSON.stringify(data);
    fs.writeFileSync(filePath, fileContents);
  } catch(e) {
    console.error('Unable to save settings file:', e);
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
