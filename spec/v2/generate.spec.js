var fs = require('fs'),
    helpers = require('../helpers'),
    path = require('path'),
    Generate = require('../../lib/v2/generate'),
    _ = require('lodash'),
    shell = require('shelljs'),
    logging = require('../../lib/logging');

logging.logger = helpers.testingLogger;

ddescribe('Generate', function() {
  it('should have generate exported', function() {
    expect(Generate).toBeDefined();
    expect(Generate.page).toBeDefined();
  });

  it('should generate a page at a directory', function() {
    //ionic g page about
    //what should happen:
    // create directories if not existing: /www, /www/app, /www/app/about
    // create files in dir: /www/app/about/
    // about.html, about.scss, about.js
    var appDir = '/ionic/app';
    spyOn(Generate, 'createScaffoldDirectories');
    spyOn(fs, 'writeFileSync');
    spyOn(Generate, 'generateHtmlTemplate');
    spyOn(Generate, 'generateScssTemplate');
    spyOn(Generate, 'generateJsTemplate');

    Generate.page(appDir, 'about');

    expect(Generate.createScaffoldDirectories).toHaveBeenCalledWith(appDir, 'about');
    expect(Generate.generateJsTemplate).toHaveBeenCalledWith('about');
    expect(Generate.generateHtmlTemplate).toHaveBeenCalledWith('about');
    expect(Generate.generateScssTemplate).toHaveBeenCalledWith('about');

    expect(fs.writeFileSync).toHaveBeenCalled();

  });

  it('should generate a page code template', function() {
    var scaffold = 'about';
    var compiledTemplate = Generate.generateJsTemplate(scaffold);
    expect(compiledTemplate).toContain('templateUrl: \'app/about/about.html\'');
    expect(compiledTemplate).toContain('export class About');
  });

  it('should generate a properly cased page template', function() {
    var scaffold = 'schedule';
    var compiledTemplate = Generate.generateJsTemplate(scaffold);
    expect(compiledTemplate).toContain('templateUrl: \'app/schedule/schedule.html\'');
    expect(compiledTemplate).not.toContain('export class schedule');
    expect(compiledTemplate).toContain('export class Schedule');
  });

  it('should generate a page html template', function() {
    var scaffold = 'sessions';
    var compiledTemplate = Generate.generateHtmlTemplate(scaffold);
    expect(compiledTemplate).toContain('<ion-content padding id="sessions">');
    expect(compiledTemplate).toContain('<ion-title>Sessions</ion-title>');

  });

  it('should generate a page sass template', function() {
    var scaffold = 'sessions';
    var compiledTemplate = Generate.generateScssTemplate(scaffold);
    expect(compiledTemplate).toContain('#sessions {');
  });

  it('should render template from file', function() {
    spyOn(fs, 'readFileSync').andReturn('faketemplate');
    var templateSpy = createSpy();

    spyOn(_, 'template').andReturn(templateSpy);
    var options = { name: 'test', templatePath: '/path/to/template.tmpl.html'};
    var generatedContents = Generate.renderTemplateFromFile(options);
    expect(fs.readFileSync).toHaveBeenCalledWith(options.templatePath, 'utf8');
    expect(_.template).toHaveBeenCalledWith('faketemplate');
    expect(templateSpy).toHaveBeenCalledWith({name: 'test', nameUppercased: 'Test'});
  });

  it('should create directories for scaffolding', function() {
    // pwd = /ionic/app
    // ionic g page about
    // create folders in /ionic/app/www/app/about
    spyOn(shell, 'mkdir');
    Generate.createScaffoldDirectories('/ionic/app', 'about');
    expect(shell.mkdir).toHaveBeenCalledWith('-p', '/ionic/app/www/app/about');
  });
});
