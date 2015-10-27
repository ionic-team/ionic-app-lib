var fs = require('fs'),
    helpers = require('../helpers'),
    path = require('path'),
    Generate = require('../../lib/v2/generate'),
    _ = require('lodash'),
    logging = require('../../lib/logging');

logging.logger = helpers.testingLogger;

ddescribe('Generate', function() {
  it('should have generate exported', function() {
    expect(Generate).toBeDefined();
    expect(Generate.page).toBeDefined();
  });

  xit('should generate a page at a directory', function() {
    //ionic g page about
    //what should happen:
    // create directories if not existing: /www, /www/app, /www/about
    // create files in dir: /www/app/about/
    // about.html, about.scss, about.js
    var appDir = '/ionic/app';
    spyOn(Generate, 'createScaffoldDirectory');
    Generate.page(appDir, 'about');

    expect(Generate.createScaffoldDirectory).toHaveBeenCalledWith(appDir, 'about');
    expect(Generate.generateHtmlTemplate).toHaveBeenCalledWith(appDir, 'about');
    expect(Generate.generateSassTemplate).toHaveBeenCalledWith(appDir, 'about');
    expect(Generate.generateJsTemplate).toHaveBeenCalledWith(appDir, 'about');

  });

  it('should generate a page template with lodash', function() {
    var scaffold = { name: 'about', appDirectory: '/ionic/app' };
    var compiledTemplate = Generate.generateJsTemplate(scaffold);
    expect(compiledTemplate).toContain('templateUrl: \'app/about/about.html\'');
    expect(compiledTemplate).toContain('export class About');
  });
});
