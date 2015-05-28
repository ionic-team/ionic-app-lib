var fs = require('fs'),
    cheerio = require('cheerio'),
    path = require('path'),
    url = require('url'),
    archiver = require('archiver'),
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicStats = require('./stats').IonicStats,
    Login = require('./login'),
    IonicUtils = require('./utils'),
    Q = require('q');

var TEMP_FILENAME = 'www.zip';
var Upload = module.exports;

Upload.doUpload = function doUpload(appDirectory) {
  events.emit('log', 'Uploading app....'.green.bold);
  var project = IonicProject.load(appDirectory);
  var documentRoot = project.get('documentRoot') || 'www';
  var indexPath = path.join(appDirectory, documentRoot, 'index.html');

  return Upload.addCacheBusters(indexPath)
  .then(function() {
    return Upload.zipContents(appDirectory);
  })
  .then(function() {
    return Upload.removeCacheBusters(indexPath);
  })
  .then(function(){
    return Upload.getDirectUploadKey();
  })
  .then(function(key){
    return Upload.uploadToS3(key);
  })
  .then(function(status) {
    return Upload.signalDashUpload();
  })
  .catch(function(ex) {
    events.emit('log', 'An error occurred uploading the build', ex);
    throw ex;
  });
};

Upload.zipContents = function zipContents(appDirectory, documentRoot) {
  var q = Q.defer();

  // var project = IonicProject.load(appDirectory);

  // var documentRoot = project.get('documentRoot') || 'www';

  if (!fs.existsSync(path.join(appDirectory, documentRoot))) {
    return utils.fail(documentRoot + ' directory cannot be found. Make sure the working directory is at the top level of an Ionic project.', 'upload');
  }

  var indexPath = path.join(appDirectory, documentRoot, 'index.html');

  var zip = fs.createWriteStream(TEMP_FILENAME);
  var zipPath = path.join(appDirectory, documentRoot);

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
    // Upload.removeCacheBusters(indexPath);
    q.resolve();
  });

  return q.promise;
};

//Upload Zip Contents
// First send request to server to get keys for amazon servers
// 
Upload.uploadZipContents = function uploadZipContents(projectd, jar, note) {
  if(typeof project == 'undefined') {
    Q.reject('There is no proper project passed');
    return
  }
  if(typeof jar == 'undefined') {
    Q.reject('There was no proper cookie jar passed');
    return
  }
  var q = Q.defer();

  events.emit('log', '\nUploading app...'.bold.green);

  var csrftoken = '';

  csrftoken = IonicUtils.retrieveCsrfToken(jar);

  var form = new FormData();
  form.append('name', project.get('name'));
  form.append('note', note);
  form.append('csrfmiddlewaretoken', csrftoken);
  // form.append('app_file', fs.createReadStream(path.resolve(TEMP_FILENAME)), {filename: TEMP_FILENAME, contentType: 'application/zip'});

  var url = ionic.IONIC_DASH + ionic.IONIC_API + 'app/direct-upload/' + project.get('app_id');
  var params = url.parse(url);

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
  }, Upload.handleIonicUploadRequest);
  return q.promise;
};

Upload.handleIonicUploadRequest = function handleIonicUploadRequest(err, response) {
  if (err) {
    events.emit('log', 'There was an error trying to upload your app.'.red.bold);
    var errorMessage;
    if(err.code === 'ENOTFOUND' || err.code === 'EPIPE') {
      errorMessage = 'The address you are trying to reach could not be found. \n' +
      'This could be your internet connection or the server itself is having issues.';
    } else {
      errorMessage = 'The specific error message: ' + err;
    }
    return utils.fail(errorMessage.red.bold);
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

      var proxy = process.env.PROXY || process.env.HTTP_PROXY || null;

      // Now we actually do the upload with the signed URL the dash returned
      request({
        method: 'PUT',
        preambleCRLF: true,
        postambleCRLF: true,
        proxy: proxy,
        uri: d.signed_request,
        headers: {
          'x-amz-acl': 'private',
          'content-type': 'application/zip'
        },
        body: fs.readFileSync(path.resolve(TEMP_FILENAME))
      },
      function(error, response, body) {
        rm('-f', TEMP_FILENAME);

        if (error) {
          return console.log('Upload Failed:', error);
        } else {
          // The final step is to signal the dash that the file was successfully uploaded
          request({
            method: 'GET',
            proxy: proxy,
            uri: ionic.IONIC_DASH + ionic.IONIC_API + 'app/direct-upload/' + project.get('app_id'),
            headers: {
              cookie: jar.map(function(c) {
                return c.key + "=" + encodeURIComponent(c.value);
              }).join("; ")
            }
          },
          function(error, response, body) {
            if (error || response.statusCode != 200) {
              console.log("Upload Failed:", error || "Server Error: " + response.statusCode);
            } else {
              console.log(('Successfully uploaded (' + project.get('app_id') + ')\n').bold);
              console.log(('Share your beautiful app with someone:\n\n$ ionic share EMAIL\n').bold);
            }
          });
        }
      });
    } 

    if ( callback ) {
      try {
        callback();
      } catch ( callbackEx ) {
        return ionic.fail('Error upload callback: ' + callbackEx);
      }
    }
  });
};

Upload.addCacheBusters = function addCacheBusters(indexPath) {
  var q = Q.defer();

  var randomString = Math.floor(Math.random() * 100000);
  var indexHtml = fs.readFileSync(indexPath, 'utf8');
  var $ = cheerio.load(indexHtml);
  var hasQuestionMark;
  var urlObj;
  $('script').each(function(i, el){
    if (typeof el.attribs.src === "undefined") return true; //continue
    hasQuestionMark = el.attribs.src.indexOf('?');
    urlObj = url.parse(el.attribs.src, true);
    urlObj.query['ionicCachebuster'] = randomString;
    el.attribs.src = url.format(urlObj);
    // el.attribs.src += (++hasQuestionMark ? '&' : '?') + "ionicCachebuster=" + randomString;
  });
  $('link').each(function(i, el){
    if (typeof el.attribs.href === "undefined") return true; //continue
    urlObj = url.parse(el.attribs.href, true);
    urlObj.query['ionicCachebuster'] = randomString;
    el.attribs.href = url.format(urlObj);
    // hasQuestionMark = el.attribs.href.indexOf('?');
    // el.attribs.href += (++hasQuestionMark ? '&' : '?') + "ionicCachebuster=" + randomString;
  });

  try {
    fs.writeFileSync(indexPath, $.html());
    q.resolve();
  } catch(e) {
    console.error("Unable to append cachebusters to index.html asset urls. Err: " + err);
    q.reject(e);
  }

  return q.promise;
};

Upload.removeCacheBusters = function removeCacheBusters(indexPath) {
  var q = Q.defer();

  var indexHtml = fs.readFileSync(indexPath, 'utf8');
  var $ = cheerio.load(indexHtml);
  var index,
      urlObj;

  $('script').each(function(i, el){
    if (typeof el.attribs.src === "undefined") return true; //continue
    // index = hasQuestionMark = el.attribs.src.indexOf('?ionicCache');
    // el.attribs.src = el.attribs.src.substring(0, ++hasQuestionMark ? index : el.attribs.src.indexOf("&ionicCache"));
    urlObj = url.parse(el.attribs.src, true);
    delete urlObj.query['ionicCachebuster'];
    delete urlObj.search; // or url.format will ignore modified `query`
    el.attribs.src = url.format(urlObj);
  });
  $('link').each(function(i, el){
    if (typeof el.attribs.href === "undefined") return true; //continue
    // index = hasQuestionMark = el.attribs.href.indexOf('?ionicCache');
    // el.attribs.href = el.attribs.href.substring(0, ++hasQuestionMark ? index : el.attribs.href.indexOf("&ionicCache"));
    urlObj = url.parse(el.attribs.href, true);
    delete urlObj.query['ionicCachebuster'];
    delete urlObj.search; // or url.format will ignore modified `query`
    el.attribs.href = url.format(urlObj);
  });
  
  try {
    fs.writeFileSync(indexPath, $.html());
    q.resolve();
  } catch(e) {
    console.error("Unable to remove cachebusters from index.html asset urls. Err: " + err);
    q.reject(e);
  }

  return q.promise;
};
