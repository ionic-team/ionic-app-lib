var fs = require('fs');
var IonicAppLib = module.exports;
var path = require('path');

function camelCase(input) {
  return input.toLowerCase().replace(/-(.)/g, function(match, group1) {
    return group1.toUpperCase();
  });
}

//
// Setup all modules as lazy-loaded getters.
//
fs.readdirSync(path.join(__dirname, 'lib')).forEach(function(file) {
  file = file.replace('.js', '');
  var command;

  if (file.indexOf('-') > 0) {
    command = camelCase(file);
  } else {
    command = file;
  }

  IonicAppLib.__defineGetter__(command, function() { // eslint-disable-line no-underscore-dangle
    return require('./lib/' + file);
  });
});

IonicAppLib.__defineGetter__('semver', function() { // eslint-disable-line no-underscore-dangle
  return require('semver');
});
