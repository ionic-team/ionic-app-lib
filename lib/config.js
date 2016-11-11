var fs = require('fs');
var path = require('path');
var Utils = require('./utils');
var Q = require('q');

var home = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;

module.exports = {
  CONFIG_FILE: '.ionic/ionic.config',
  load: function() {
    this.file = this.CONFIG_FILE;
    if (fs.existsSync(path.join(home, this.file))) {
      try {
        this.data = JSON.parse(fs.readFileSync(path.join(home, this.file)));
      } catch(e) {
        console.error('Unable to parse Ionic Config file. Please make sure it is valid JSON (' + this.CONFIG_FILE + ')');
        throw e;
      }
    } else {
      this.data = {};
    }
    return this;
  },
  promiseLoad: function() {
    var self = this;
    self.file = self.CONFIG_FILE;
    var readFile = Utils.promisify(fs.readFile);

    return readFile(path.join(home, self.file)).then(function(jsonContents) {
      self.data = jsonContents.toString();
      return self;
    });
  },
  save: function() {
    if (!this.data) {
      return;
    }
    try {
      var dirPath = path.join(home, path.dirname(this.CONFIG_FILE));
      var p = path.join(home, this.CONFIG_FILE);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      }
      fs.writeFileSync(p, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('Unable to save settings file: ' + e);
    }
  },
  promiseSave: function() {
    if (!this.data) {
      return Q.resolve();
    }
    var dirPath = path.join(home, path.dirname(this.CONFIG_FILE));
    var filepath = path.join(dirPath, this.CONFIG_FILE);
    var statFile = Utils.promisify(fs.stat);
    var mkDir = Utils.promisify(fs.mkdir);
    var jsonString = JSON.stringify(this.data, null, 2);

    return statFile(dirPath).then(function(stat) {
      return Utils.writeJsonContents(filepath, jsonString);
    }, function() {
      return mkDir(dirPath).then(function() {
        return Utils.writeJsonContents(filepath, jsonString);
      });
    });
  },
  get: function(k) {
    return this.data[k];
  },
  set: function(k, v) {
    if (!this.data) {
      this.data = {};
    }
    this.data[k] = v;

    this.save();
  }
};
