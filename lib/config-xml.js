var fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    xml2js = require('xml2js'),
    Utils = require('./utils'),
    logging = require('./logging');

var ConfigXml = module.exports;

ConfigXml.loadToJson = function(appDirectory, options) {
  var d = Q.defer();

  if (!appDirectory) {
    appDirectory = process.cwd();
  }

  var configXmlPath = path.join(appDirectory, 'config.xml');
  var file = path.join(appDirectory, 'config.xml');

  fs.readFile(configXmlPath, { encoding: 'utf8' }, function(err, data) {
    if (err) return d.reject(err);

    xml2js.parseString(data, function(err, configJson) {
      if (err) return d.reject(err);

      d.resolve(configJson);
    });
  });

  return d.promise;
};

ConfigXml.loadToStream = function(appDirectory) {
  if (!appDirectory) {
    appDirectory = process.cwd();
  }

  return fs.createReadStream(path.join(appDirectory, 'config.xml'));
};

ConfigXml.setConfigXml = function setConfigXml(appDirectory, options) {
  var madeChange = false;

  if (!appDirectory) {
    appDirectory = process.cwd();
  }

  logging.logger.debug('ConfigXml.setConfigXml', appDirectory, options);

  var configXmlPath = path.join(appDirectory, 'config.xml');

  if (!fs.existsSync(configXmlPath)) {
    // working directory does not have the config.xml file
    if(options.errorWhenNotFound) {
      return Q.reject('Unable to locate config.xml file. Please ensure the working directory is at the root of the app where the config.xml should be located.');
    }
  }

  return ConfigXml.loadToJson(appDirectory, options)
    .then(function(configJson) {
      if (!configJson.widget) {
        throw new Error('\nYour config.xml file is invalid. You must have a <widget> element.');
      } else if(configJson.widget && !configJson.widget.content) {
        throw new Error('\nYour config.xml file does not have a <content> element. \nAdd something like: <content src="index.html"/>');
      }

      if (options.devServer) {
        if (!configJson.widget.content[0].$['original-src']) {
          configJson.widget.content[0].$['original-src'] = configJson.widget.content[0].$.src;
          madeChange = true;
        }
        if (configJson.widget.content[0].$.src !== options.devServer) {
          configJson.widget.content[0].$.src = options.devServer;
          madeChange = true;
        }

      } else if(options.resetContent) {

        if (configJson.widget.content[0].$['original-src']) {
          configJson.widget.content[0].$.src = configJson.widget.content[0].$['original-src'];
          delete configJson.widget.content[0].$['original-src'];
          madeChange = true;
        }
      }

      if (madeChange) {
        var xmlBuilder = new xml2js.Builder();
        configString = xmlBuilder.buildObject(configJson);
        fs.writeFileSync(configXmlPath, configString);
      }
    })
};
