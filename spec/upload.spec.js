// var upload = require('../lib/upload'),
//     Q = require('q');

// describe('Upload command', function() {

//   beforeEach(function() {
    // console.log('proto', ionicCordova);
    // spyOn(cordova, 'runCordova');
    // require('../lib/ionic/cordova').runCordova();
    // console.log('\n\nproto after setting it', ionicCordova.prototype.runCordova);
    // spyOn(cordova, 'runCordova');
    // spyOn(ionicCordova.prototype, 'dothis');
    // IonicEmulate = new ionicCordova();
    // console.log('ionicCordova.runCordova!!!', IonicEmulate.runCordova)
    // spyOn(Ionic, 'setConfigXml').and.returnValue(Q());
    // ionicspy.andReturn(Q());
    // argv = null;
  // });

//   describe('argument checking', function(done) {
//     it('should fail due to invalid platform passed', function(done) {
//       upload.UploadZipContents()
//       .fail(function(err) {
//         expect(err.message).toBe('There is no proper project passed');
//       })
//       .fin(done);
//     })
//   })
// });


// describe('cordova create checks for valid-identifier', function(done) {    

//     it('should reject reserved words from start of id', function(done) {
//         cordova.raw.create('projectPath', 'int.bob', 'appName')
//         .fail(function(err) {
//             expect(err.message).toBe('App id contains a reserved word, or is not a valid identifier.');
//         })
//         .fin(done);
//     });

//     it('should reject reserved words from end of id', function(done) {
//         cordova.raw.create('projectPath', 'bob.class', 'appName')
//         .fail(function(err) {
//             expect(err.message).toBe('App id contains a reserved word, or is not a valid identifier.');
//         })
//         .fin(done);
//     });
// });
