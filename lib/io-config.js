var fs = require('fs'),
    IonicProject = require('./project'),
    Utils = require('./utils'),
    request = require('request'),
    path = require('path'),
    Q = require('q'),
    settings = require('./settings'),
    cheerio = require('cheerio'),
    logging = require('./logging');

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

var CORE_FILE = './www/lib/ionic-platform-web-client/dist/ionic.io.bundle.js';
var CORE_FILE_MIN = './www/lib/ionic-platform-web-client/dist/ionic.io.bundle.min.js';
var CONFIG_BACKUP = './.io-config.json'
var INDEX_FILE = './www/index.html';
var APP_FILE = './www/js/app.js';
var TMP_ERR = './errors.html'
var IO_COMPONENTS = {
  'ionic-platform-web-client': {
    name: 'ionic.service.core',
    path: 'lib/ionic-platform-web-client/dist/ionic.io.bundle.js',
    minPath: 'lib/ionic-platform-web-client/dist/ionic.io.bundle.min.js',
    config: [
      {key: 'dev_push', value: 'true'}
    ]
  },
  'ngCordova': {
    name: 'ngCordova',
    path: 'lib/ngCordova/dist/ng-cordova.js',
    minPath: 'lib/ngCordova/dist/ng-cordova.js',
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

var SETTINGS_REPLACE_START = "\\\"IONIC_SETTINGS_STRING_START\\\";";
var SETTINGS_REPLACE_END = "\\\"IONIC_SETTINGS_STRING_END\\\"";
var SETTINGS_REPLACEMENT = "return { get: function(setting) { if (settings[setting]) { return settings[setting]; } return null; } };";

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
        logging.logger.error('Error reading config', err);
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
        logging.logger.info(item.key + item.value);
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
      if (!jsonObj['app_id'] || !jsonObj['api_key']) {
        safe = false;
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
            logging.logger.info("Saved " + key + ", writing to ionic.io.bundle.min.js...");
          } else {
            logging.logger.info('Building platform config...')
          }
          IoConfig.isCoreAvailable().then(function(available) {
            if (available) {
              fs.readFile(CORE_FILE_MIN, function(er, content) {
                var jsMinFile = String(content);
                var replacementString = "var settings = " + JSON.stringify(jsonObj) + "; " + SETTINGS_REPLACEMENT;
                jsMinFile = jsMinFile.replace(new RegExp('(' + SETTINGS_REPLACE_START + ')(.*?)(' + SETTINGS_REPLACE_END + ')', 'g'), '$1' + replacementString + '$3')
                if (jsMinFile) {
                  fs.writeFile(CORE_FILE_MIN, jsMinFile, function(e){
                    if (e) {
                      deferred.reject(new Error(e));
                    }
                    deferred.resolve(key);
                  });
                } else {
                  console.error('Unable to build the config factory'.red);
                  deferred.resolve(key);
                }
              });

              fs.readFile(CORE_FILE, function(er, content) {
                var jsFile = String(content);
                var replacementString = "var settings = " + JSON.stringify(jsonObj) + "; " + SETTINGS_REPLACEMENT;
                jsFile = jsFile.replace(new RegExp('(' + SETTINGS_REPLACE_START + ')(.*?)(' + SETTINGS_REPLACE_END + ';)', 'g'), '$1' + replacementString + '$3')
                if (jsFile) {
                  fs.writeFile(CORE_FILE, jsFile, function(e){
                    if (e) {
                      deferred.reject(new Error(e));
                    }
                    deferred.resolve(key);
                  });
                } else {
                  logging.logger.error('Unable to build the config factory'.red);
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
    logging.logger.error('Unauthorized configuration value'.red);
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
    var ioMinPath = IO_COMPONENTS[component].minPath;
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
            logging.logger.error("ERROR: ", err);
            deferred.reject(new Error(err));
          } else {
            var exists = false;
            var coreScript = false;
            var ionicBundle = false;
            $ = cheerio.load(data);
            $("script").each(function() {
              if ($(this).attr('src') === "lib/ionic-platform-web-client/dist/ionic.io.bundle.min.js") {
                coreScript = this;
              } else if ($(this).attr('src') === "lib/ionic/js/ionic.bundle.js") {
                ionicBundle = this;
              }
              if ($(this).attr('src') === "cordova.js" && name === "ionic.service.core" && set) {
                $(this).replaceWith("<!-- Cordova is bootstrapped by ionic-platform-web-client, uncomment this if you remove ionic-platform-web-client... -->\n<!-- " + $(this) + " -->");
              } else if (!set && $(this).attr('src') === ioPath) {
                logging.logger.info("Deleting component from index.html");
                $(this).remove();
              } else if (!set && $(this).attr('src') === ioMinPath) {
                console.log("Deleting component from index.html");
                $(this).remove();
              } else if (set && $(this).attr('src') === ioMinPath) {
                exists = true;
              } else if (set && $(this).attr('src') === ioPath) {
                exists = true;
              }
            });
            if (set && !exists) {
              logging.logger.info('Adding component to index.html');
              var newScript = "\n<script src='" + ioMinPath + "'></script>";
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
                logging.logger.error("ERROR: ", error);
                deferred.reject(new Error(error));
              }
            });
          }
        });
        fs.readFile(APP_FILE, function(err, data) {
          if (err) {
            logging.logger.error("ERROR: ", err);
            logging.logger.error("Is your app declaration contained in 'app.js'?");
            deferred.reject(new Error(err));
          } else {
            // Parse the file to string and remove existing references to the component
            var jsFile = String(data);
            jsFile = jsFile.replace("\'" + name + "\',", '');
            jsFile = jsFile.replace('\"' + name + '\",', '');
            if (set) {
              logging.logger.info('Injecting ' + name + ' into app.js');
              if (name === 'ionic.service.core') {
                jsFile = jsFile.replace("\'ionic\',", "\'ionic\'," + "\'" + name + "\',");
                jsFile = jsFile.replace('\"ionic\",', '\"ionic\",' + "\'" + name + "\',");
              } else {
                jsFile = jsFile.replace("\'ionic.service.core\',", "\'ionic.service.core\'," + "\'" + name + "\',");
                jsFile = jsFile.replace('\"ionic.service.core\",', '\"ionic.service.core\",' + "\'" + name + "\',");
              }
            } else {
              logging.logger.info('Removing ' + name + ' from app.js');
            }
            fs.writeFile(APP_FILE, jsFile, function(error) {
              if (err) {
                logging.logger.error("ERROR: ", error);
                deferred.reject(new Error(error));
              } else {
                deferred.resolve(true);
              }
            });
          }
        });
      } else {
        logging.logger.warn('Automatic file manipulation disabled, please manually inject components.'.yellow);
        deferred.resolve(true);
      }
    });
  }
  return deferred.promise;
};

IoConfig.initIoPlatform = function initIoPlatform(appDirectory, jar) {
  logging.logger.info('Initializing app with ionic.io....'.green.bold);

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
            logging.logger.error('Error saving API key:', error);
          });
        }
      }, function(error) {
        logging.logger.error('Error saving app ID:', error);
      });
      // Set project vars
      project.set('app_id', key.app_id);
      project.save();
    })
    .catch(function(ex) {
      logging.logger.error('An error occurred initializing the app: %s', ex, {});
      throw ex;
    });
  } catch(ex) {
    logging.logger.error("Error initializing app: %s", ex, {});
  }
}

IoConfig.dashInit = function dashInit(project, jar) {
  var q = Q.defer();

  logging.logger.debug('Getting app information from ', settings.IONIC_DASH);
  var csrftoken = Utils.retrieveCsrfToken(jar);

  request.post({
    headers: {
      'content-type' : 'application/json',
      'cookie' : jar.map(function(c) {
        return c.key + "=" + encodeURIComponent(c.value);
      }).join("; "),
      'X_CSRFToken': csrftoken
    },
    url: settings.IONIC_DASH_API + 'app/init-io-app/' + project.get('app_id'),
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
