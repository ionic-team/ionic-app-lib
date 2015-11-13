var build,
    path = require('path'),
    rewire = require('rewire');

describe('build', function() {

  var webpackConfig,
      bundleOptions,
      callbackSpy, 
      compileSpy,
      webpackSpy;

  beforeEach(function() {
    build = rewire('../lib/v2/build');
    webpackConfig = require('./v2/webpack.config');
    
    callbackSpy = createSpy();
    compileSpy = createSpyObj('compile', ['run', 'watch']);
    webpackSpy = createSpy().andReturn(compileSpy);

    bundleOptions = {
      appDirectory: path.join(__dirname, 'v2'),
      watch: true,
      callback: callbackSpy
    };

    build.__set__('webpack', webpackSpy);
  })

  it('should have build defined', function() {
    expect(build).toBeDefined();
  });

  it('should call webpacks bundle with the proper config', function() {
    bundleOptions.watch = false;
    build.bundle(bundleOptions);
    expect(webpackSpy).toHaveBeenCalled();
    expect(compileSpy.run).toHaveBeenCalled();
  });

  it('should call webpack compiler watch', function() {
    build.bundle(bundleOptions);
    expect(webpackSpy).toHaveBeenCalled();
    expect(compileSpy.watch).toHaveBeenCalled();
  });

});
