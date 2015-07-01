var fs = require('fs'),
    cheerio = require('cheerio'),
    events = require('./events'),
    path = require('path'),
    url = require('url'),
    archiver = require('archiver'),
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicStats = require('./stats').IonicStats,
    Login = require('./login'),
    IonicUtils = require('./utils'),
    Q = require('q'),
    settings = require('./settings'),
    shelljs = require('shelljs');

var TEMP_FILENAME = 'www.zip';
var Upload = module.exports;

Upload.doUpload = function doUpload(appDirectory, jar, note) {
  events.emit('log', 'Uploading app....'.green.bold);
  events.emit('verbose', 'Upload doUpload - ', appDirectory, jar);

  var project = IonicProject.load(appDirectory);
  var documentRoot = project.get('documentRoot') || 'www';
  var indexPath = path.join(appDirectory, documentRoot, 'index.html');
  var uploadKey;
  try {
    return Upload.addCacheBusters(indexPath)
    .then(function() {
      return Upload.zipContents(appDirectory, documentRoot);
    })
    .then(function() {
      return Upload.removeCacheBusters(indexPath);
    })
    .then(function(){
      return Upload.getDirectUploadKey(project, jar, note);
    })
    .then(function(key){
      uploadKey = key;
      project.set('app_id', key.app_id);
      project.save();
      return Upload.uploadToS3(appDirectory, key);
    })
    .then(function(status) {
      return Upload.signalDashUpload(project, jar);
    })
    .then(function(status) {
      return uploadKey;
    })
    .catch(function(ex) {
      events.emit('verbose', 'An error occurred uploading the build', ex);
      throw ex;
    });
  } catch(ex) {
    events.emit('verbose', 'Upload errors occurred - ', ex);
  }
};

Upload.uploadToS3 = function uploadToS3(appDirectory, keyInfo) {
  var q = Q.defer();

  events.emit('verbose', 'Uploading zip file to S3');
  
  var proxy = process.env.PROXY || process.env.HTTP_PROXY || null;
  var zipFile = path.join(appDirectory, TEMP_FILENAME);
  // Now we upload with the signed URL the dash returned
  events.emit('verbose', zipFile);
  request({
    method: 'PUT',
    preambleCRLF: true,
    postambleCRLF: true,
    proxy: proxy,
    uri: keyInfo.signed_request,
    headers: {
      'x-amz-acl': 'private',
      'content-type': 'application/zip'
    },
    body: fs.readFileSync(zipFile)
  },
  function(error, response, body) {
    shelljs.rm('-f', path.join(appDirectory, TEMP_FILENAME));

    if (error) {
      return q.reject('Upload Failed:', error);
    } else {
      q.resolve(true);
    }
  });

  return q.promise;
};

Upload.signalDashUpload = function signalDashUpload(project, jar) {
  var q = Q.defer();

  events.emit('verbose', 'Signaling to ionic.io completion of the upload');

  var proxy = process.env.PROXY || process.env.HTTP_PROXY || null;

  // The final step is to signal the dash that the file was successfully uploaded
  request({
    method: 'GET',
    proxy: proxy,
    uri: settings.IONIC_DASH + settings.IONIC_API + 'app/direct-upload/' + project.get('app_id'),
    headers: {
      cookie: jar.map(function(c) {
        return c.key + "=" + encodeURIComponent(c.value);
      }).join("; ")
    }
  },
  function(error, response, body) {
    if (error || response.statusCode != 200) {
      q.reject("Upload Failed:", error || "Server Error: " + response.statusCode);
    } else {
      events.emit('log', ('Successfully uploaded (' + project.get('app_id') + ')\n').bold);
      events.emit('log', ('Share your beautiful app with someone:\n\n$ ionic share EMAIL\n').bold);
      q.resolve(true);
    }
  });

  return q.promise;
};

Upload.getDirectUploadKey = function getDirectUploadKey(project, jar, note) {
  var q = Q.defer();

  note = note ? note : '';

  events.emit('verbose', 'Getting Upload information from ', settings.IONIC_DASH);

  var csrftoken = '';

  csrftoken = IonicUtils.retrieveCsrfToken(jar);

  var form = new FormData();
  form.append('name', project.get('name'));
  form.append('note', note);
  form.append('csrfmiddlewaretoken', csrftoken);

  var directUploadUrl = settings.IONIC_DASH + settings.IONIC_API + 'app/direct-upload/' + project.get('app_id');
  var params = url.parse(directUploadUrl);

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
    if (err) {
      events.emit('log', 'There was an error trying to upload your app.'.red.bold);
      var errorMessage;
      if(err.code === 'ENOTFOUND' || err.code === 'EPIPE') {
        errorMessage = 'The address you are trying to reach could not be found. \n' +
        'This could be your internet connection or the server itself is having issues.';
      } else {
        errorMessage = 'The specific error message: ' + err;
      }
      // return ionic.fail(errorMessage.red.bold);
      q.reject(errorMessage);
    }

    response.setEncoding('utf8');

    var data = '',
        jsonData;
    response.on('data', function(chunk){
      data += chunk;
    });

    response.on('end', function() {
      if ( response.statusCode == 401 ) {
        return q.reject('Session expired (401). Please log in and run this command again.');
      } else if ( response.statusCode == 403 ) {
        return q.reject('Forbidden upload (403)');
      } else if ( response.statusCode == 500 ) {
        return q.reject('Server Error (500) :(');
      } 

      try {
        jsonData = JSON.parse(data);
      } catch ( parseEx ) {
        // keep error msg reasonably short
        // return ionic.fail('Error malformed response: ' + parseEx +
                             // '\nResponse: ' + data.substr(0, 80)); 
        return q.reject(parseEx);
      }

      if (response.statusCode != 200 ) {
        
        var errorMessage = jsonData ? jsonData['errors'] : 'Unknown error';
        return q.reject(['An error occurred uploading your application - ', errorMessage].join(''));
      }

      q.resolve(jsonData);

    });    
  });

  return q.promise;
};

Upload.zipContents = function zipContents(appDirectory, documentRoot) {
  var q = Q.defer();

  events.emit('verbose', 'Now zipping contents of ' + path.join(appDirectory, documentRoot));

  if (!fs.existsSync(path.join(appDirectory, documentRoot))) {
    return utils.fail(documentRoot + ' directory cannot be found. Make sure the working directory is at the top level of an Ionic project.', 'upload');
  }

  var indexPath = path.join(appDirectory, documentRoot, 'index.html');

  var zip = fs.createWriteStream(path.join(appDirectory, TEMP_FILENAME));
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

// If your Webview's strange, and its cache is no good? Who you gonna call?
//
// Cachebusters!
Upload.addCacheBusters = function addCacheBusters(indexPath) {
  var q = Q.defer();

  events.emit('verbose', 'When your webview is acting crazy who do you call? Cachebusters!');

  var randomString = Math.floor(Math.random() * 100000);
  var indexHtml = fs.readFileSync(indexPath, 'utf8');
  var $ = cheerio.load(indexHtml, { decodeEntities: false });
  var urlObj;

  try {
    $('script').each(function(i, el){
      if (typeof el.attribs.src === "undefined") return true; //continue
      urlObj = url.parse(el.attribs.src, true);
      urlObj.query['ionicCachebuster'] = randomString;
      el.attribs.src = url.format(urlObj);
    });
    $('link').each(function(i, el){
      if (typeof el.attribs.href === "undefined") return true; //continue
      urlObj = url.parse(el.attribs.href, true);
      urlObj.query['ionicCachebuster'] = randomString;
      el.attribs.href = url.format(urlObj);
    });

    var htmlToSave = $.html();

    var bomIndex = htmlToSave.indexOf('&#xFEFF;');

    if (bomIndex !== -1) {
      htmlToSave = htmlToSave.replace('&#xFEFF;', '');
    }

    fs.writeFileSync(indexPath, htmlToSave);
    q.resolve();
  } catch(e) {
    console.error("Unable to append cachebusters to index.html asset urls. Err: " + err);
    q.reject(e);
  }

  return q.promise;
};

Upload.removeCacheBusters = function removeCacheBusters(indexPath) {
  var q = Q.defer();

  events.emit('verbose', 'Removing cachebusting ', indexPath);

  var indexHtml = fs.readFileSync(indexPath, 'utf8');
  var $ = cheerio.load(indexHtml);
  var index,
      urlObj;

  try {

    $('script').each(function(i, el){
      if (typeof el.attribs.src === "undefined") return true; //continue
      urlObj = url.parse(el.attribs.src, true);
      
      //Fix for: https://github.com/driftyco/ionic-cli/issues/504
      if (!urlObj.query['ionicCachebuster']) return true;

      delete urlObj.query['ionicCachebuster'];
      delete urlObj.search; // or url.format will ignore modified `query`
      el.attribs.src = url.format(urlObj);
    });
    $('link').each(function(i, el){
      if (typeof el.attribs.href === "undefined") return true; //continue
      urlObj = url.parse(el.attribs.href, true);
      delete urlObj.query['ionicCachebuster'];
      delete urlObj.search; // or url.format will ignore modified `query`
      el.attribs.href = url.format(urlObj);
    });

    fs.writeFileSync(indexPath, $.html());
    q.resolve();
  } catch(e) {
    console.error("Unable to remove cachebusters from index.html asset urls. Err: " + e);
    q.reject(e);
  }
  return q.promise;
};
