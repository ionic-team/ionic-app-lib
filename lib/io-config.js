var fs = require('fs'),
    IonicProject = require('./project'),
    IonicUtils = require('./utils'),
    request = require('request'),
    path = require('path'),
    Q = require('q'),
    settings = require('./settings'),
    cheerio = require('cheerio');

var IoConfig = module.exports;

/**
.factory('$ionicCoreSettings', [], function() {
  var settings = {}
  return {
    get: function(setting) {
      if (settings[setting]) {
        return settings[setting];
      }
      return null;
    }
}
**/

var CORE_FILE = './www/lib/ionic-service-core/ionic-core.js';
var CONFIG_BACKUP = './.io-config.json'
var INDEX_FILE = './www/index.html';
var APP_FILE = './www/js/app.js';
var TMP_ERR = './errors.html'
var IO_COMPONENTS = {
  'ionic-service-core': {
    name: 'ionic.service.core',
    path: 'lib/ionic-service-core/ionic-core.js',
    config: []
  },
  'ionic-service-push': {
    name: 'ionic.service.push',
    path: 'lib/ionic-service-push/ionic-push.js',
    config: [
      {key: 'dev_push', value: true}
    ]
  },
  'ionic-service-deploy': {
    name: 'ionic.service.deploy',
    path: 'lib/ionic-service-deploy/ionic-deploy.js',
    config: []
  },
  'ionic-service-analytics': {
    name: 'ionic.service.analytics',
    path: 'lib/ionic-service-analytics/ionic-analytics.js',
    config: []
  },
  'ngCordova': {
    name: 'ngCordova',
    path: 'lib/ngCordova/dist/ng-cordova.js',
    config: []
  }
};
var ALLOWED_CONFIG = {
  'app_id': {
    type: 'string'
  },
  'api_key': {
    type: 'string'
  },
  'disable_modifications': {
    type: 'boolean'
  },
  'dev_push': {
    type: 'boolean'
  },
  'gcm_key': {
    type: 'string'
  },
  'io_api': {
    type: 'string'
  },
  'push_api': {
    type: 'string'
  }
};

var FACTORY_PREFIX = "// Auto-generated configuration factory\n.factory('$ionicCoreSettings', function() {\n  var settings = ";
var FACTORY_SUFFIX = ";\n  return {\n    get: function(setting) {\n      if (settings[setting]) {\n        return settings[setting];\n      }\n      return null;\n    }\n  }\n})\n// Auto-generated configuration factory";

IoConfig.isCoreAvailable = function isCoreAvailable() {
  var deferred = Q.defer();
  fs.exists(CORE_FILE, function(exists) {
    if (exists) {
      deferred.resolve(true);
    } else {
      deferred.resolve(false);
    }
  });
  return deferred.promise;
}

IoConfig.doesHaveKey = function doesHaveKey(key) {
  var deferred = Q.defer();
  fs.readFile(CONFIG_BACKUP, function(err, data) {
    if (data) {
      jsonObj = JSON.parse(data);
      if (jsonObj[key]) {
        deferred.resolve(true);
      } else {
        deferred.resolve(false);
      }
    } else {
      deferred.resolve(false);
    }
  });
  return deferred.promise;
}

IoConfig.listConfig = function listConfig() {
  fs.readFile(CONFIG_BACKUP, function(err, data) {
    if (err) {
      if (!err.code === 'ENOENT') {
        console.log('Error reading config', err);
      }
    } else if (data) {
      jsonObj = JSON.parse(data);
      var keys = [{key: 'KEY:', value: '  VALUE:'}];
      var longest = -1;
      for (var key in jsonObj) {
        if (jsonObj.hasOwnProperty(key)) {
          if (key.length + 1 > longest) {
            longest = key.length + 1;
          }
          keys.push({key: key + ' ', value: '| ' + jsonObj[key]});
        }
      }
      keys.forEach(function(item) {
        while (item.key.length < longest) {
          item.key += ' ';
        }
        console.log(item.key + item.value )
      });
    }
  });
}

IoConfig.warnMissingData = function warnMissingData() {
  var deferred = Q.defer();
  var jsonObj = {};
  fs.readFile(CONFIG_BACKUP, function(err, data) {
    if (err && !err.code === 'ENOENT') {
      deferred.reject(new Error(err));
    } else if (data) {
      jsonObj = JSON.parse(data);
      var safe = true;
      if (!jsonObj['app_id']) {
        safe = false;
        console.log('No app ID detected, please run \n' + 'ionic upload'.yellow);
      }
      if (!jsonObj['api_key']) {
        safe = false;
        console.log('No API key detected, please run \n' + 'ionic config set api_key your-api-key'.yellow);
      }
      deferred.resolve(safe);
    }
  });
  return deferred.promise;
}

IoConfig.writeIoConfig = function writeIoConfig(key, val, set) {
  var deferred = Q.defer();
  if (ALLOWED_CONFIG[key] || key == false) {
    var type = 'undefined';
    if (!key == false) {
      type = ALLOWED_CONFIG[key].type;
    }
    fs.readFile(CONFIG_BACKUP, function(err, data) {
      if (err) {
        if (err.code === 'ENOENT') {
          var jsonObj = {};
          if (key && set) {
            if (type === 'boolean') {
              if (val === 'true') {
                jsonObj[key] = true
              } else {
                jsonObj[key] = false
              }
            } else if (type === 'string') {
              jsonObj[key] = String(val);
            } else {
              jsonObj[key] = val
            }
          }
        } else {
          deferred.reject(new Error(err));
        }
      } else {
        var jsonObj = JSON.parse(data);
        if (key) {
          if (set) {
            if (type === 'boolean') {
              if (val === 'true') {
                jsonObj[key] = true
              } else {
                jsonObj[key] = false
              }
            } else if (type === 'string') {
              jsonObj[key] = String(val);
            }
            else {
              jsonObj[key] = val
            }
          } else if (!set && jsonObj[key]) {
            delete jsonObj[key]
          }
        }
      }
      fs.writeFile(CONFIG_BACKUP, JSON.stringify(jsonObj), function(error) {
        if (error) {
          deferred.reject(new Error(error));
        } else {
          if (key) {
            console.log("Saved " + key + ", writing to ionic-core.js...");
          } else {
            console.log('Building core config factory...')
          }
          IoConfig.isCoreAvailable().then(function(available) {
            if (available) {
              fs.readFile(CORE_FILE, function(er, content) {
                var jsFile = String(content);
                var slices = jsFile.split('// Auto-generated configuration factory');
                if (slices.length === 3) {
                  jsFile = slices[0] + FACTORY_PREFIX + JSON.stringify(jsonObj) + FACTORY_SUFFIX + slices[2];
                  fs.writeFile(CORE_FILE, jsFile, function(e){
                    if (e) {
                      deferred.reject(new Error(e));
                    }
                    deferred.resolve(key);
                  });
                } else {
                  console.log('Outdated ionic-service-core, please install the latest version.'.red);
                  deferred.resolve(key);
                }
              });
            } else {
              deferred.resolve(key);
            }
          });
        }
      });
    });
  } else {
    console.log('Unauthorized configuration value'.red);
    deferred.reject("Unauthorized configuration value");
  }
  return deferred.promise;
};

IoConfig.getAppId = function getAppId() {
  return IonicProject.load('.').get().app_id;
};

IoConfig.injectIoComponent = function injectIoComponent(set, component) {
  var self = this;
  var deferred = Q.defer();
  if (IO_COMPONENTS[component]) {
    var name = IO_COMPONENTS[component].name;
    var ioPath = IO_COMPONENTS[component].path;

    if (IO_COMPONENTS[component].config.length) {
      IO_COMPONENTS[component].config.forEach(function(item) {
        self.doesHaveKey(item.key).then(function(available) {
          if (!available) {
            self.writeIoConfig(item.key, item.value, true);
          } else if (!set) {
            self.writeIoConfig(item.key, item.value, false);
          }
        });
      });
    }

    fs.readFile(CONFIG_BACKUP, function(e, d) {
      var disable = false;
      if (d) {
        if (JSON.parse(d).disable_modifications) {
          disable = true;
        }
      }
      if (!disable) {
        fs.readFile(INDEX_FILE, function(err, data) {
          if (err) {
            console.log("ERROR: ", err);
            deferred.reject(new Error(err));
          } else {
            var exists = false;
            var coreScript = false;
            var ionicBundle = false;
            $ = cheerio.load(data);
            $("script").each(function() {
              if ($(this).attr('src') === "lib/ionic-service-core/ionic-core.js") {
                coreScript = this;
              } else if ($(this).attr('src') === "lib/ionic/js/ionic.bundle.js") {
                ionicBundle = this;
              }
              if ($(this).attr('src') === "cordova.js" && name === "ionic.service.deploy" && set) {
                $(this).replaceWith("<!-- Cordova is bootstrapped by ionic-service-core, uncomment this if you remove ionic-service-core... -->\n<!-- " + $(this) + " -->");
              } else if (!set && $(this).attr('src') === ioPath) {
                console.log("Deleting component from index.html");
                $(this).remove();
              } else if (set && $(this).attr('src') === ioPath) {
                exists = true;
              }
            });
            if (set && !exists) {
              console.log('Adding component to index.html');
              var newScript = "\n<script src='" + ioPath + "'></script>";
              if (coreScript && name !== 'ionic.service.core') {
                $(coreScript).after(newScript);
              } else if (ionicBundle && name === 'ionic.service.core'){
                $(ionicBundle).after(newScript);
              } else {
                $('head').append(newScript);
              }
            }
            if (!set && name === 'ionic.service-deploy') {
              var nodes = $("head").contents();
              for(var prop in nodes){
                if (nodes.hasOwnProperty(prop) && nodes[prop].type === 'comment') {
                  if (nodes[prop].data.indexOf('<script src="cordova.js"></script>') > -1) {
                    $(nodes[prop]).replaceWith('<script src="cordova.js"></script>');
                  }
                }
              }
            }
            fs.writeFile(INDEX_FILE, $.html(), function(error) {
              if (err) {
                console.log("ERROR: ", error);
                deferred.reject(new Error(error));
              }
            });
          }
        });
        fs.readFile(APP_FILE, function(err, data) {
          if (err) {
            console.log("ERROR: ", err);
            console.log("Is your app declaration contained in 'app.js'?");
            deferred.reject(new Error(err));
          } else {
            // Parse the file to string and remove existing references to the component
            var jsFile = String(data);
            jsFile = jsFile.replace("\'" + name + "\',", '');
            jsFile = jsFile.replace('\"' + name + '\",', '');
            if (set) {
              console.log('Injecting ' + name + ' into app.js');
              if (name === 'ionic.service.core') {
                jsFile = jsFile.replace("\'ionic\',", "\'ionic\'," + "\'" + name + "\',");
                jsFile = jsFile.replace('\"ionic\",', '\"ionic\",' + "\'" + name + "\',");
              } else {
                jsFile = jsFile.replace("\'ionic.service.core\',", "\'ionic.service.core\'," + "\'" + name + "\',");
                jsFile = jsFile.replace('\"ionic.service.core\",', '\"ionic.service.core\",' + "\'" + name + "\',");
              }
            } else {
              console.log('Removing ' + name + ' from app.js');
            }
            fs.writeFile(APP_FILE, jsFile, function(error) {
              if (err) {
                console.log("ERROR: ", error);
                deferred.reject(new Error(error));
              } else {
                deferred.resolve(true);
              }
            });
          }
        });
      } else {
        console.log('Automatic file manipulation disabled, please manually inject components.'.yellow);
        deferred.resolve(true);
      }
    });
  }
  return deferred.promise;
};

IoConfig.initIoPlatform = function initIoPlatform(appDirectory, jar) {
  events.emit('log', 'Initializing app with ionic.io....'.green.bold);

  var project = IonicProject.load(appDirectory);
  var documentRoot = project.get('documentRoot') || 'www';
  var indexPath = path.join(appDirectory, documentRoot, 'index.html');
  try {
    return IoConfig.dashInit(project, jar).then(function(key){
      // Save App ID and API key to the io-config
      IoConfig.writeIoConfig('app_id', key.app_id, true).then(function(obj){
        if (key.api_key) {
          IoConfig.writeIoConfig('api_key', key.api_key, true).then(function(apiKey){
            IoConfig.warnMissingData();
          }, function(error) {
            console.log('Error saving API key:', error);
          });
        }
      }, function(error) {
        console.log('Error saving app ID:', error);
      });
      // Set project vars
      project.set('app_id', key.app_id);
      project.save();
    })
    .catch(function(ex) {
      events.emit('verbose', 'An error occurred initializing the app', ex);
      throw ex;
    });
  } catch(ex) {
    console.log("Error initializing app:", ex);
  }
}

IoConfig.dashInit = function dashInit(project, jar) {
  var q = Q.defer();

  events.emit('verbose', 'Getting app information from ', settings.IONIC_DASH);
  var csrftoken = IonicUtils.retrieveCsrfToken(jar);

  request.post({
    headers: {
      'content-type' : 'application/json',
      'cookie' : jar.map(function(c) {
        return c.key + "=" + encodeURIComponent(c.value);
      }).join("; "),
      'X_CSRFToken': csrftoken
    },
    url: settings.IONIC_DASH + settings.IONIC_API + 'app/init-io-app/' + project.get('app_id'),
    json: true,
    body: {
      name: project.get('name')
    }
  }, function(error, response){
    if (error) {
      q.reject(error);
    } else {
      q.resolve(response.body);
    }
  });
  return q.promise;
};
