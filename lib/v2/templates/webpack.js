var webpack = require('webpack');

module.exports = {
  name: '',
  proxies: null,
  hooks: {
    beforeServe: function(argv) {
      var config = require('./webpack.config.js');
      var compiler = webpack(config);

      var statsOptions = {
        'colors': true,
        'modules': true,
        'chunks': false,
        'exclude': ['node_modules']
      }

      compiler.run(function(err, stats){
        console.log(stats.toString(statsOptions));
      });
    }
  }
}
