var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    Generate = module.exports;


Generate.page = function page(appDirectory) {

};

Generate.generateJsTemplate = function generateJsTemplate(options) {
  var jsTemplatePath = path.join(__dirname, 'page.tmpl.js');
  var jsTemplateContents = fs.readFileSync(jsTemplatePath, 'utf8');
  var c = _.template(jsTemplateContents);
  var nameUppercased = options.name.charAt(0).toUpperCase() + options.name.slice(1);
  var result = c({name: options.name, nameUppercased: nameUppercased});
  return result;
}
