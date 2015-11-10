var webpack = require('webpack');

module.exports = {
  name: '',
  proxies: null,
  beforeServe: function(argv) {
    var config = require('webpack.config.js');
    webpack.run(config);  
  }
}
