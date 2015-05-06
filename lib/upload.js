var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    archiver = require('archiver'),
    argv = require('optimist').argv,
    FormData = require('form-data'),
    IonicProject = require('./project'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    IonicLoginTask = require('./login').IonicTask,
    IonicUtils = require('./utils');

var TEMP_FILENAME = 'www.zip';

var Upload = module.exports;

Upload.UploadZipContents = function UploadZipContents(appDirectory) {

};

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic, argv) {
  var q = Q.defer();
  var cookieJar = null;

  //Get project settings
  try {
    project = IonicProject.load();
  }catch (ex) {
    q.reject(ex.message);
    // this.ionic.fail(ex.message);
    return
  }

  //Login user
  LoginTask.login(ionic)
  .then(function(jar) {
    cookieJar = jar;
    return ZipContents();
  })
  .then(function(zip) {
    return UploadZipContents(project, cookieJar, note);
  })
  .catch(function(error) {
    //Report error
    q.reject(error);
  })
  .fin(function(data) {
    q.resolve(data);
  })

  return q.promise;
}

// IonicTask.prototype.setNote = function(note) {
//   this.note = note
// };

Upload.ZipContents = function ZipContents(appDirectory) {
  var q = Q.defer();

  // IonicStats.t();

  var zip = fs.createWriteStream(TEMP_FILENAME);
  var zipPath = path.join(appDirectory, 'www');

  var archive = archiver('zip');
  archive.pipe(zip);

  archive.bulk([
    { expand: true, cwd: zipPath, src: ['**'] }
  ]);

  archive.finalize(function(err, bytes) {
    if (err) {
      // return ionic.fail("Error uploading: " + err);
      q.reject(['Error uploading: ', err].join(''));
    }
  });

  zip.on('close', function() {
    q.resolve();
  });

  return q.promise;
}

var UploadZipContents = function UploadZipContents(project, jar, note) {
  if(typeof project == 'undefined') {
    Q.reject('There is no proper project passed');
    return
  }
  if(typeof jar == 'undefined') {
    Q.reject('There was no proper cookie jar passed');
    return
  }
  var q = Q.defer();

  console.log('\nUploading app...'.bold.green);

  var csrftoken = '';

  csrftoken = IonicUtils.retrieveCsrfToken(jar);

  var form = new FormData();
  form.append('name', project.get('name'));
  form.append('note', note);
  form.append('csrfmiddlewaretoken', csrftoken);
  form.append('app_file', fs.createReadStream(path.resolve(TEMP_FILENAME)), {filename: TEMP_FILENAME, contentType: 'application/zip'});

  var url = ionic.IONIC_DASH + ionic.IONIC_API + 'app/upload/' + project.get('app_id');
  var params = parseUrl(url);

  form.submit({
    protocol: params.protocol,
    hostname: params.hostname,
    port: params.port,
    path: params.path,
    headers: form.getHeaders({
      cookie: jar.map(function(c) {
        return c.key + "=" + encodeURIComponent(c.value);
      }).join("; ")
    })
  }, function(err, response) {

    rm('-f', TEMP_FILENAME);
    if (err) {
      return ionic.fail("Error uploading: " + err);
    }

    response.setEncoding('utf8');

    var data = "";
    response.on('data', function(chunk){
      data += chunk;
    });

    response.on('end', function() {

      if ( response.statusCode == 401 ) {
        return ionic.fail('Session expired (401). Please log in and run this command again.');
      } else if ( response.statusCode == 403 ) {
        return ionic.fail('Forbidden upload (403)');
      } else if ( response.statusCode == 500 ) {
        return ionic.fail('Server Error (500) :(');
      } 

      try {
        var d = JSON.parse(data);
      } catch ( parseEx ) {
        // keep error msg reasonably short
        return ionic.fail('Error malformed response: ' + parseEx +
                             '\nResponse: ' + data.substr(0, 80)); 
      }

      if ( d.errors && d.errors.length ) {
        for ( var j = 0; j < d.errors.length; j++ ) {
          console.error(d.errors[j]);
        }
        return ionic.fail('Unable to upload app');
      }

      if ( response.statusCode == 200 ) {
        // Success
        project.set('app_id', d.app_id);
        project.save();
        console.log(('Successfully uploaded (' + project.get('app_id') + ')\n').bold);
      } 

      q.resolve();
      // console.log('callback', callback)
      // if ( callback ) {
      //   try {
      //     callback();
      //   } catch ( callbackEx ) {
      //     console.log('callbackEx', callbackEx.stack)
      //     return ionic.fail('Error upload callback: ' + callbackEx);
      //   }
      // }
    });
  });
  return q.promise;
}

// exports = {
//   IonicTask: IonicTask,
//   UploadZipContents: UploadZipContents,
//   ZipContents: ZipContents
// }
