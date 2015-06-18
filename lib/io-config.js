var fs = require('fs'),
    IonicProject = require('./project'),
    cheerio = require('cheerio');

var IoConfig = module.exports;

var CONFIG_FILE = './www/lib/ionic-service-core/ionic-core-settings.json';
var INDEX_FILE = './www/index.html';
var APP_FILE = './www/js/app.js';

IoConfig.writeIoConfig = function writeIoConfig(key, val, set) {
  fs.readFile(CONFIG_FILE, function(err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        var jsonObj = {};
        if (set) {
          jsonObj[key] = val
        }
        fs.writeFile(CONFIG_FILE, JSON.stringify(jsonObj), function(error) {
          if (error) {
            console.log("ERROR: ", error);
          } else {
            console.log("Successfully saved " + key );
          }
        });
      } else {
        console.log("ERROR: ", err);
      }
    } else {
      var jsonObj = JSON.parse(data);
      if (set) {
        jsonObj[key] = val
      } else if (!set && jsonObj[key]) {
        delete jsonObj[key]
      }
      fs.writeFile(CONFIG_FILE, JSON.stringify(jsonObj), function(error) {
        if (error) {
          console.log("ERROR: ", error);
        } else {
          console.log("Successfully saved " + key );
        }
      });
    }
  });
};

IoConfig.getAppId = function getAppId() {
  return IonicProject.load('.').get().app_id;
};

IoConfig.injectIoComponent = function injectIoComponent(set, path, name) {
  fs.readFile(INDEX_FILE, function(err, data) {
    if (err) {
      console.log("ERROR: ", err);
      console.log("Have you run 'ionic add ionic-service-core' yet?");
    } else {
      var exists = false;
      var coreScript = false;
      $ = cheerio.load(data);
      $("script").each(function() {
        if ($(this).attr('src') === "lib/ionic-service-core/ionic-core.js") {
          coreScript = this;
        }
        if (!set && $(this).attr('src') === path) {
          console.log("Deleting component from index.html");
          $(this).remove();
        } else if (set && $(this).attr('src') === path) {
          exists = true;
        }
      });
      if (set && !exists) {
        console.log('Adding component to index.html');
        var newScript = "\n<script src='" + path + "'></script>";
        if (coreScript) {
          $(coreScript).after(newScript);
        } else {
          $('head').append(newScript);
        }
      }
      fs.writeFile(INDEX_FILE, $.html(), function(error) {
        if (err) {
          console.log("ERROR: ", error);
        }
      });
    }
  });

  fs.readFile(APP_FILE, function(err, data) {
    if (err) {
      console.log("ERROR: ", err);
      console.log("Is your app declaration contained in 'app.js'?");
    } else {
      // Parse the file to string and remove existing references to the component
      var jsFile = String(data);
      jsFile = jsFile.replace("\'" + name + "\',", '');
      jsFile = jsFile.replace('\"' + name + '\",', '');
      if (set) {
        console.log('Injecting ' + name + ' into app.js');
        jsFile = jsFile.replace("\'ionic.service.core\',", "\'ionic.service.core\'," + "\'" + name + "\',");
        jsFile = jsFile.replace('\"ionic.service.core\",', '\"ionic.service.core\",' + "\'" + name + "\',");
      } else {
        console.log('Removing ' + name + ' from app.js');
      }
      fs.writeFile(APP_FILE, jsFile, function(error) {
        if (err) {
          console.log("ERROR: ", error);
        }
      });
    }
  });
};
