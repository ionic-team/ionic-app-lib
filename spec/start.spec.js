var start = require('../lib/start'),
    Q = require('q'),
    events = require('../lib/events');

events.on('log', console.log)


// Things to test 
// Does it allow invalid vars? 
// What if a path doesnt exist?
// Invalid ID?
var dummyPath = '/Users/Test/Development/Ionic',
    dummyPackageName = 'com.ionic.app', 
    dummyAppName = 'Ionic App';

describe('Start tests', function(done) {

  it('should have start app defined', function() {
    expect(start.startApp).toBeDefined();
  })

  it('should have fetchWrapper defined', function() {
    expect(start.fetchWrapper).toBeDefined();
  })

  it('should have start defined', function() {
    expect(start.start).toBeDefined();
  })

  describe('Start app tests', function(done) {
    var startAppFunctions = ['fetchWrapper', 'fetchSeed', 'loadAppSetup', 'initCordova', 'setupSass', 'finalize'];
    beforeEach(function() {
      // spyOn(start, 'fetchSeed').andCallFake(function() {
      //   console.log('fetchSeed fake is going')
      //   return Q('Seed was called');
      // });
      startAppFunctions.forEach(function(func) {
        spyOn(start, func).andReturn(Q('Function:' + func));
      })
      // spyOn(start, 'fetchSeed').andReturn(Q());
      // spyOn(start, 'fetchWrapper').andReturn(Q());
      // spyOn(start, 'fetchWrapper').andCallFake(function() {
      //   console.log('fake for fetchWrapper')
      //   return Q('Fetch Wrapper was called');
      // })

    })

    // it('should fail if an invalid path is passed', function() {
    //   expect(function() {
    //     start.start('.')
    //   }).toThrow('Invalid target path, you may not specify \'.\' as an app name')
    // })

    // it('should call startApp if start has proper params', function() {
    //   spyOn(start, 'startApp');
    //   // console.log('startApp', start.startApp)
    //   start.start(dummyPath);
    //   expect(start.startApp).toHaveBeenCalled();
    // })

    // it('should call fetchWrapper with proper variables', function(done) {
    //   console.log('this happened')
    //   start.startApp(dummyPath, 'tabs', dummyPackageName, dummyAppName, true, false)
    //   expect(start.fetchWrapper).toHaveBeenCalledWith(dummyPath, true);
    //   done()
    // })

    it('should call fetchSeed after calling fetchWrapper', function(done) {
      Q()
      .then(function(data) {
        return start.startApp(dummyPath, 'tabs', dummyPackageName, dummyAppName, true, false)
      })
      .then(function(data) {
        expect(start.fetchWrapper).toHaveBeenCalled();
        expect(start.fetchSeed).toHaveBeenCalledWith(dummyPath, 'tabs');
      })
      .catch(function(data) {
        expect('this').toBe('not this');
      })
      .fin(done);
    })
  })

  describe('fetchSeed', function() {
    it('should call fetchIonicStart for an Ionic template type', function(done) {
      spyOn(start, 'fetchIonicStarter').andReturn();

      Q()
      .then(function() {
        return start.fetchSeed(dummyPath, 'tabs')
      })
      .then(function() {
        expect(start.fetchIonicStarter).toHaveBeenCalledWith('tabs');
      })
      .catch(function(data) {
        expect('this').toBe('not this' + data);
      })
      .fin(done)
    })

    it('should call fetchCodepen when codepen URL is passed', function(done) {
      var codepenUrl = 'http://codepen.io/mhartington/pen/eomzw';
      spyOn(start, 'fetchCodepen').andReturn();

      Q()
      .then(function(){
        return start.fetchSeed(dummyPath, codepenUrl);
      })
      .then(function() {
        expect(start.fetchCodepen).toHaveBeenCalledWith(dummyPath, codepenUrl)
      })
      .catch(function(err) {
        expect('this').toBe('not this'+ err);
      })
      .fin(done)
    })

  })

})
