var fs = require('fs'),
    IonicProject = require('./project'),
    cheerio = require('cheerio');

var IoConfig = module.exports;

var CONFIG_FILE = './www/lib/ionic-service-core/ionic-core-settings.json';
var CONFIG_BACKUP = './.io-config.json'
var INDEX_FILE = './www/index.html';
var APP_FILE = './www/js/app.js';

IoConfig.writeIoConfig = function writeIoConfig(key, val, set) {
  var write = true;
  fs.readFile(CONFIG_BACKUP, function(err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        var jsonObj = {};
        if (set) {
          jsonObj[key] = val
        }
      } else {
        write = false;
        console.log("ERROR: ", err);
      }
    } else {
      var jsonObj = JSON.parse(data);
      if (set) {
        jsonObj[key] = val
      } else if (!set && jsonObj[key]) {
        delete jsonObj[key]
      }
    }
    if (write) {
      fs.writeFile(CONFIG_BACKUP, JSON.stringify(jsonObj), function(error) {
        if (error) {
          console.log("ERROR: ", error);
        } else {
          console.log("Saved " + key );
          fs.writeFile(CONFIG_FILE, JSON.stringify(jsonObj), function(e){
            if (error) {
              console.log("ERROR: ", e);
            }
          });
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
        } else if (!set && $(this).attr('src') === path) {
          console.log("Deleting component from index.html");
          $(this).remove();
        } else if (set && $(this).attr('src') === path) {
          exists = true;
        }
      });
      if (set && !exists) {
        console.log('Adding component to index.html');
        var newScript = "\n<script src='" + path + "'></script>";
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
        }
      });
    }
  });
};
