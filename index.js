var fs = require('fs'),
    IonicAppLib = module.exports,
    path = require('path');

var capitalize = function capitalize(str) {
  return str && str[0].toUpperCase() + str.slice(1);
};

var camelCase = function camelCase(input) { 
    return input.toLowerCase().replace(/-(.)/g, function(match, group1) {
        return group1.toUpperCase();
    });
};

//
// Setup all modules as lazy-loaded getters.
//
fs.readdirSync(path.join(__dirname, 'lib')).forEach(function (file) {
  file = file.replace('.js', '');
  var command;

  if (file.indexOf('-') > 0) {
    command = camelCase(file);
  } else {
    command = file;
  }

  IonicAppLib.__defineGetter__(command, function () {
    return require('./lib/' + file);
  });
});

IonicAppLib.__defineGetter__('semver', function () {
  return require('semver');
});
