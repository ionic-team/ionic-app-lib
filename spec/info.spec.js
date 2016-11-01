var Info = require('../lib/info');

describe('Info', function() {

  it('should have gatherInfo call other helper methods', function() {
    var info = Info.gatherInfo();

    console.log(info);
  });
});
