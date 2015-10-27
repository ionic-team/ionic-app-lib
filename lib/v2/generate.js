var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    Generate = module.exports;


Generate.page = function page(appDirectory) {

};

/* 
  Will take options to render an html, js, or scss template.
  options:
    name: the name of the component/page being rendered, ex: 'IonicTest'
    templatePath: the path of the template to render (html/js/scss), ex: '/path/to/page.tmpl.html'
*/
Generate.renderTemplateFromFile = function renderTemplateFromFile(options) {
  var templateContents = fs.readFileSync(options.templatePath, 'utf8');
  var templateCompiler = _.template(templateContents);
  var nameUppercased = options.name.charAt(0).toUpperCase() + options.name.slice(1);
  var result = templateCompiler({name: options.name, nameUppercased: nameUppercased});
  return result;
};

/* 
  Will take options to render the basic page template
  options:
    name: the name of the component/page being rendered, ex: 'IonicTest'
    templatePath: the path of the template to render (html/js/scss), ex: '/path/to/page.tmpl.html'
*/
Generate.generateJsTemplate = function generateJsTemplate(name) {
  var jsTemplatePath = path.join(__dirname, 'page.tmpl.js');
  return Generate.renderTemplateFromFile({ name: name, templatePath: jsTemplatePath});
};

Generate.generateHtmlTemplate = function generateHtmlTemplate(name) {
  var htmlTemplatePath = path.join(__dirname, 'page.tmpl.html');
  return Generate.renderTemplateFromFile({ name: name, templatePath: htmlTemplatePath});
};
