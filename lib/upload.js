var fs = require('fs'),
    cheerio = require('cheerio'),
    path = require('path'),
    url = require('url'),
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicStats = require('./stats').IonicStats,
    Login = require('./login'),
    Utils = require('./utils'),
    Q = require('q'),
    settings = require('./settings'),
    ioLib = require('./io-config'),
    request = require('request'),
    shelljs = require('shelljs'),
    logging = require('./logging');

var TEMP_FILENAME = 'www.zip';
var Upload = module.exports;

Upload.doUpload = function doUpload(appDirectory, jar, note, deploy) {
  logging.logger.info('Uploading app....'.green.bold);
  logging.logger.debug('Upload doUpload - ', appDirectory, jar);

  if (deploy && deploy === true) {
    logging.logger.info('Deploy channel not provided; defaulting to dev.');
    deploy = 'dev'; // this is the default channel_tag
  }

  var project = IonicProject.load(appDirectory);
  var documentRoot = project.get('documentRoot') || 'www';
  var indexPath = path.join(appDirectory, documentRoot, 'index.html');
  var upload;
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
      // Save App ID and API key to the io-config
      ioLib.writeIoConfig('app_id', key.app_id, true)
      .then(function(key){
        // Do nothing
      }, function(error) {
        logging.logger.error('Error saving app ID:', error);
      });

      // Set project vars
      project.set('app_id', key.app_id);
      project.save();
      return Upload.uploadToS3(appDirectory, key);
    })
    .then(function(status) {
      return Upload.signalDashUpload(project, jar);
    })
    .then(function(status) {
      upload = status;

      var version = false;
      if (status && (typeof status === 'object') && status.version) {
        version = status.version;
        if (status.api_key) {
          ioLib.writeIoConfig('api_key', status.api_key, true).then(function(apiKey){
            ioLib.warnMissingData();
          }, function(error) {
            logging.logger.error('Error saving API key:', error);
          });
        }
      }
      return Upload.verify_tag(project, jar, deploy, version);
    })
    .then(function(deploy) {
      return Upload.deploy(project, jar, deploy);
    })
    .then(function(status) {
      return upload;
    })
    .catch(function(ex) {
      logging.logger.error('An error occurred uploading the build: %s', ex, {});
      throw ex;
    });
  } catch(ex) {
    logging.logger.error('Upload errors occurred - %s', ex, {});
  }
};

Upload.uploadToS3 = function uploadToS3(appDirectory, keyInfo) {
  var q = Q.defer();

  logging.logger.debug('Uploading zip file to S3');

  var proxy = process.env.PROXY || process.env.HTTP_PROXY || null;
  var zipFile = path.join(appDirectory, TEMP_FILENAME);
  // Now we upload with the signed URL the dash returned
  logging.logger.debug(zipFile);

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
      return q.reject(error);
      // return q.reject('Upload Failed:', error);
    } else {
      q.resolve(true);
    }
  });

  return q.promise;
};

Upload.signalDashUpload = function signalDashUpload(project, jar) {
  var q = Q.defer();

  logging.logger.debug('Signaling to ionic.io completion of the upload');

  var proxy = process.env.PROXY || process.env.HTTP_PROXY || null;

  // The final step is to signal the dash that the file was successfully uploaded
  request({
    method: 'GET',
    proxy: proxy,
    uri: settings.IONIC_DASH_API + 'app/direct-upload/' + project.get('app_id'),
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
      logging.logger.info(('Successfully uploaded (' + project.get('app_id') + ')\n').bold);
      logging.logger.info(('Share your beautiful app with someone:\n\n$ ionic share EMAIL\n').bold);
      q.resolve(JSON.parse(body));
    }
  });

  return q.promise;
};

Upload.verify_tag = function verify_tag(project, jar, deploy, version) {
  var q = Q.defer();

  logging.logger.debug('Checking if we need to deploy the upload');

  if (deploy && version) {

    var proxy = process.env.PROXY || process.env.HTTP_PROXY || null;

    request({
      method: 'GET',
      proxy: proxy,
      uri: settings.IONIC_DASH_API + 'apps/' + project.get('app_id') + '/channels/tag/' + deploy,
      headers: {
        cookie: jar.map(function(c) {
          return c.key + "=" + encodeURIComponent(c.value);
        }).join("; ")
      }
    },
    function(error, response, body) {
      if (error || response.statusCode != 200) {
        q.reject("Deploy failed to verify the channel tag");
      } else {
        logging.logger.debug('Verified channel tag...');
        q.resolve({ 'version': version, 'channel': JSON.parse(body)});
      }
    });
  } else {
    q.resolve(false);
  }

  return q.promise;
};

Upload.deploy = function deploy(project, jar, deploy) {
  var q = Q.defer();

  logging.logger.debug('Check for a deploy...');

  if (deploy) {
    logging.logger.info('Deploying to channel: ' + deploy.channel.label.green.bold);

    var proxy = process.env.PROXY || process.env.HTTP_PROXY || null;

    var csrftoken = Utils.retrieveCsrfToken(jar);

    request({
      method: 'PUT',
      proxy: proxy,
      uri: settings.IONIC_DASH_API + 'apps/' + project.get('app_id') + '/channels/' + deploy.channel.id.toString() + '/',
      headers: {
        cookie: jar.map(function(c) {
          return c.key + "=" + encodeURIComponent(c.value);
        }).join("; "),
        'X_CSRFToken': csrftoken,
        'Content-Type': 'application/json'
      },
      form: { 'version': deploy.version }
    },
    function(error, response, body) {
      if (error || response.statusCode != 200) {
        q.reject("Deploy failed: " +  (error || response.statusCode));
      } else {
        logging.logger.info('Deploy Successful!'.green.bold)
        q.resolve(true);
      }
    });
  } else {
    q.resolve(false);
  }

  return q.promise;
};

Upload.getDirectUploadKey = function getDirectUploadKey(project, jar, note) {
  var q = Q.defer();

  note = note ? note : '';

  logging.logger.debug('Getting Upload information from ', settings.IONIC_DASH);

  var csrftoken = '';

  csrftoken = Utils.retrieveCsrfToken(jar);

  var form = new FormData();
  form.append('name', project.get('name'));
  form.append('note', note);
  form.append('csrfmiddlewaretoken', csrftoken);

  var directUploadUrl = settings.IONIC_DASH_API + 'app/direct-upload/' + project.get('app_id');
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
      logging.logger.info('There was an error trying to upload your app.'.red.bold);
      var errorMessage;
      if(err.code === 'ENOTFOUND' || err.code === 'EPIPE') {
        errorMessage = 'The address you are trying to reach could not be found. \n' +
        'This could be your internet connection or the server itself is having issues.';
      } else {
        errorMessage = 'The specific error message: ' + err;
      }
      // return ionic.fail(errorMessage.red.bold);
      q.reject(errorMessage);
      return;
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
      } else if ( response.statusCode == 522 ) {
        return q.reject('Connection timed out (522) :(');
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
  return Utils.createArchive(appDirectory, documentRoot);
};

// If your Webview's strange, and its cache is no good? Who you gonna call?
//
// Cachebusters!
Upload.addCacheBusters = function addCacheBusters(indexPath) {
  var q = Q.defer();

  logging.logger.debug('When your webview is acting crazy who do you call? Cachebusters!');

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

  logging.logger.debug('Removing cachebusting ', indexPath);

  var indexHtml = fs.readFileSync(indexPath, 'utf8');
  var $ = cheerio.load(indexHtml, { decodeEntities: false });
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
