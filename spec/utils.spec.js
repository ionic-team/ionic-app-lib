var utils = require('../lib/utils')

describe('Utils', function() {

  it('should have methods defined', function() {
    var methods = ['transformCookies', 'retrieveCsrfToken', 'fetchArchive', 'preprocessOptions', 'getContentSrc', 'fail'];
    methods.forEach(function(method) {
      expect(utils[method]).toBeDefined();
    })
  })

  describe('#transformCookies', function(){ 
    it('should check for valid cookie jar', function() {
      expect(function() {
       utils.transformCookies(null) 
      }).toThrow('You parse out cookies if they are null')
    })
  })

})
