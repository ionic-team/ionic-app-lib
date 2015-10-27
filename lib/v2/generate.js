var _ = require('lodash'),
    fs = require('fs'),
    logging = require('../logging'),
    path = require('path'),
    shell = require('shelljs'),
    Generate = module.exports;

Generate.page = function page(appDirectory, name) {
  //ionic g page about
  //what should happen:
  // create directories if not existing: /www, /www/app, /www/app/about
  // create files (about.html, about.scss, about.js) in /www/app/about
  Generate.createScaffoldDirectories(appDirectory, name.toLowerCase());

  var jsTemplate = Generate.generateJsTemplate(name);
  var htmlTemplate = Generate.generateHtmlTemplate(name);
  var scssTemplate = Generate.generateScssTemplate(name);

  var pagePath = path.join(appDirectory, 'www', 'app', name),
      jsPath = path.join(pagePath, [name, '.js'].join('')),
      htmlPath = path.join(pagePath, [name, '.html'].join('')),
      scssPath = path.join(pagePath, [name, '.scss'].join(''));

  logging.logger.info('√ Create'.blue, path.relative(appDirectory, jsPath));
  fs.writeFileSync(jsPath, jsTemplate, 'utf8');
  logging.logger.info('√ Create'.blue, path.relative(appDirectory, htmlPath));
  fs.writeFileSync(htmlPath, htmlTemplate, 'utf8');
  logging.logger.info('√ Create'.blue, path.relative(appDirectory, scssPath));
  fs.writeFileSync(scssPath, scssTemplate, 'utf8');

  //TODO: Modify the main sass file (via config) to somehow update it
  //to include this sass file. 
  //In the meantime, put a console message to alert them
  logging.logger.info('* Tip: if youd like to include the generated sass file, include it in your main sass file');
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
  var result = templateCompiler({name: options.name.toLowerCase(), nameUppercased: nameUppercased});
  return result;
};

/* 
  Will take options to render the basic page javascript template
    the name of the component/page being rendered, ex: 'IonicTest'
*/
Generate.generateJsTemplate = function generateJsTemplate(name) {
  var jsTemplatePath = path.join(__dirname, 'page.tmpl.js');
  return Generate.renderTemplateFromFile({ name: name.toLowerCase(), templatePath: jsTemplatePath});
};

/* 
  Will take options to render the basic page html template
    the name of the component/page being rendered, ex: 'IonicTest'
*/
Generate.generateHtmlTemplate = function generateHtmlTemplate(name) {
  var htmlTemplatePath = path.join(__dirname, 'page.tmpl.html');
  return Generate.renderTemplateFromFile({ name: name.toLowerCase(), templatePath: htmlTemplatePath});
};

Generate.generateScssTemplate = function generateScssTemplate(name) {
  var scssTemplatePath = path.join(__dirname, 'page.tmpl.scss');
  return Generate.renderTemplateFromFile({ name: name.toLowerCase(), templatePath: scssTemplatePath});
};

Generate.createScaffoldDirectories = function createScaffoldDirectories(appDirectory, componentName) {
  var componentPath = path.join(appDirectory, 'www', 'app', componentName.toLowerCase());
  shell.mkdir('-p', componentPath);
};
