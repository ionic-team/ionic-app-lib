var transpile = require('../lib/transpile');

describe('transpile', function() {

  it('should have transpile defined', function() {
    expect(transpile).toBeDefined();
  });

  it('should get webpack configuration based on app path passed', function() {
    var fakePath = '/ionic/app/path';
    var webpackConfig = transpile.webpackConfigForPath(fakePath);
    expect(webpackConfig).toBeDefined();
    expect(webpackConfig.entry).toBeDefined();
    expect(webpackConfig.output).toBeDefined();
    expect(webpackConfig.output.path).toBe('/ionic/app/path/www/app/build/js');
    expect(webpackConfig.output.filename).toBe('app.bundle.js');
    expect(webpackConfig.module.loaders[0].include).toBe('/ionic/app/path/www/app');
    expect(webpackConfig.module.loaders[1].include).toBe('/ionic/app/path/www/app');
  });

});
