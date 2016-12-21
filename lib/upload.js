var fs = require('fs');
var cheerio = require('cheerio');
var path = require('path');
var url = require('url');
var FormData = require('form-data');
var IonicProject = require('./project');
var Utils = require('./utils');
var Q = require('q');
var settings = require('./settings');
var ioLib = require('./io-config');
var request = require('request');
var shelljs = require('shelljs');
var log = require('./logging').logger;
var chalk = require('chalk');

var TEMP_FILENAME = 'www.zip';
var Upload = module.exports;

Upload.doUpload = function doUpload(appDirectory, jar, note, deploy) {
  log.info('Uploading app...\n');
  log.debug('Upload doUpload - ', appDirectory, jar);

  if (deploy && deploy === true) {
    log.info('Deploy channel not provided; defaulting to dev.');
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
    .then(function() {
      return Upload.getDirectUploadKey(project, jar, note);
    })
    .then(function(key) {

      // Save App ID and API key to the io-config
      ioLib.writeIoConfig('app_id', key.app_id, true)
      .then(function() {

        // Do nothing
      }, function(error) {
        log.error('Error saving app ID:', error);
      });

      // Set project vars
      project.set('app_id', key.app_id);
      project.save();
      return Upload.uploadToS3(appDirectory, key);
    })
    .then(function() { // receives status
      return Upload.signalDashUpload(project, jar);
    })
    .then(function(status) {
      upload = status;

      var version = false;
      if (status && (typeof status === 'object') && status.version) {
        version = status.version;
        if (status.api_key) {
          ioLib.writeIoConfig('api_key', status.api_key, true).then(function() { // receives apiKey
            ioLib.warnMissingData();
          }, function(error) {
            log.error('Error saving API key:', error);
          });
        }
      }
      return Upload.verify_tag(project, jar, deploy, version);
    })
    .then(function(deploy) {
      return Upload.deploy(project, jar, deploy);
    })
    .then(function() { // receives status
      return upload;
    })
    .catch(function(ex) {
      log.error('An error occurred uploading the build: %s', ex, {});
      throw ex;
    });
  } catch (ex) {
    log.error('Upload errors occurred - %s', ex, {});
  }
};

Upload.uploadToS3 = function uploadToS3(appDirectory, keyInfo) {
  var q = Q.defer();

  log.debug('Uploading zip file to S3');

  var proxy = Utils.getProxy();
  var zipFile = path.join(appDirectory, TEMP_FILENAME);

  // Now we upload with the signed URL the dash returned
  log.debug(zipFile);

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
  function(error) {
    shelljs.rm('-f', path.join(appDirectory, TEMP_FILENAME));

    if (error) {
      return q.reject(error);
    } else {
      q.resolve(true);
    }
  });

  return q.promise;
};

Upload.signalDashUpload = function signalDashUpload(project, jar) {
  var q = Q.defer();

  log.debug('Signaling to ionic.io completion of the upload');

  var proxy = Utils.getProxy();

  // The final step is to signal the dash that the file was successfully uploaded
  request({
    method: 'GET',
    proxy: proxy,
    uri: settings.IONIC_DASH_API + 'app/direct-upload/' + project.get('app_id'),
    headers: {
      cookie: jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; ')
    }
  },
  function(error, response, body) {
    if (error || parseInt(response.statusCode, 10) !== 200) {
      q.reject('Upload Failed:', error || 'Server Error: ' + response.statusCode);
    } else {
      log.info(chalk.bold('Successfully uploaded (' + project.get('app_id') + ')\n'));
      log.info(chalk.bold('Share your beautiful app with a client or co-worker to test in Ionic View (http://view.ionic.io):\n\n$ ionic share EMAIL\n'));
      q.resolve(JSON.parse(body));
    }
  });

  return q.promise;
};

Upload.verify_tag = function verify_tag(project, jar, deploy, version) { // eslint-disable-line camelcase
  var q = Q.defer();

  log.debug('Checking if we need to deploy the upload');

  if (deploy && version) {

    var proxy = Utils.getProxy();

    request({
      method: 'GET',
      proxy: proxy,
      uri: settings.IONIC_DASH_API + 'apps/' + project.get('app_id') + '/channels/tag/' + deploy,
      headers: {
        cookie: jar.map(function(c) {
          return c.key + '=' + encodeURIComponent(c.value);
        }).join('; ')
      }
    },
    function(error, response, body) {
      if (error || parseInt(response.statusCode, 10) !== 200) {
        q.reject('Deploy failed to verify the channel tag');
      } else {
        log.debug('Verified channel tag...');
        q.resolve({
          version: version,
          channel: JSON.parse(body)
        });
      }
    });
  } else {
    q.resolve(false);
  }

  return q.promise;
};

Upload.deploy = function deploy(project, jar, deploy) {
  var q = Q.defer();

  log.debug('Check for a deploy...');

  if (deploy) {
    log.info('Deploying to channel: ' + chalk.green.bold(deploy.channel.label));

    var proxy = Utils.getProxy();

    var csrftoken = Utils.retrieveCsrfToken(jar);

    request({
      method: 'PUT',
      proxy: proxy,
      uri: settings.IONIC_DASH_API + 'apps/' + project.get('app_id') +
        '/channels/' + deploy.channel.id.toString() + '/',
      headers: {
        cookie: jar.map(function(c) {
          return c.key + '=' + encodeURIComponent(c.value);
        }).join('; '),
        X_CSRFToken: csrftoken, // eslint-disable-line camelcase
        'Content-Type': 'application/json'
      },
      form: { version: deploy.version }
    },
    function(error, response) {
      if (error || parseInt(response.statusCode, 10) !== 200) {
        q.reject('Deploy failed: ' +  (error || response.statusCode));
      } else {
        log.info(chalk.green.bold('Deploy Successful!'));
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

  log.debug('Getting Upload information from ', settings.IONIC_DASH);

  var csrftoken = '';

  csrftoken = Utils.retrieveCsrfToken(jar);

  var projectName = project.get('name');

  if(!projectName) {
    log.error(chalk.bold('Please set the name of your app in ionic.config.json before uploading.\n'));
    q.reject('Missing app name in ionic.config.json');
    return q.promise;
  }

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
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; ')
    })
  }, function(err, response) {
    if (err) {
      log.error('There was an error trying to upload your app.');
      var errorMessage;
      if (err.code === 'ENOTFOUND' || err.code === 'EPIPE') {
        errorMessage = 'The address you are trying to reach could not be found. \n' +
        'This could be your internet connection or the server itself is having issues.';
      } else {
        errorMessage = 'The specific error message: ' + err;
      }
      q.reject(errorMessage);
      return;
    }

    response.setEncoding('utf8');

    var data = '';
    var jsonData;
    response.on('data', function(chunk) {
      data += chunk;
    });

    response.on('end', function() {
      if (parseInt(response.statusCode, 10) === 401) {
        return q.reject('Session expired (401). Please log in and run this command again.');
      } else if (parseInt(response.statusCode, 10) === 403) {
        return q.reject('Forbidden upload (403)');
      } else if (parseInt(response.statusCode, 10) === 500) {
        return q.reject('Server Error (500) :(');
      } else if (parseInt(response.statusCode, 10) === 522) {
        return q.reject('Connection timed out (522) :(');
      }

      try {
        jsonData = JSON.parse(data);
      } catch (parseEx) {

        // keep error msg reasonably short
        return q.reject(parseEx);
      }

      if (parseInt(response.statusCode, 10) !== 200) {

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

  log.debug('When your webview is acting crazy who do you call? Cachebusters!');

  var randomString = Math.floor(Math.random() * 100000);
  var indexHtml = fs.readFileSync(indexPath, 'utf8');
  var $ = cheerio.load(indexHtml, { decodeEntities: false });
  var urlObj;

  try {
    $('script').each(function(i, el) {
      if (typeof el.attribs.src === 'undefined') return true; // continue
      urlObj = url.parse(el.attribs.src, true);
      urlObj.query['ionicCachebuster'] = randomString;
      el.attribs.src = url.format(urlObj);
    });
    $('link').each(function(i, el) {
      if (typeof el.attribs.href === 'undefined') return true; // continue
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
  } catch (e) {
    log.error('Unable to append cachebusters to index.html asset urls. Err: ' + e);
    q.reject(e);
  }

  return q.promise;
};

Upload.removeCacheBusters = function removeCacheBusters(indexPath) {
  var q = Q.defer();

  log.debug('Removing cachebusting ', indexPath);

  var indexHtml = fs.readFileSync(indexPath, 'utf8');
  var $ = cheerio.load(indexHtml, { decodeEntities: false });
  var index,
      urlObj;

  try {

    $('script').each(function(i, el) {
      if (typeof el.attribs.src === 'undefined') return true; // continue
      urlObj = url.parse(el.attribs.src, true);

      // Fix for: https://github.com/driftyco/ionic-cli/issues/504
      if (!urlObj.query['ionicCachebuster']) return true;

      delete urlObj.query['ionicCachebuster'];
      delete urlObj.search; // or url.format will ignore modified `query`
      el.attribs.src = url.format(urlObj);
    });
    $('link').each(function(i, el) {
      if (typeof el.attribs.href === 'undefined') return true; // continue
      urlObj = url.parse(el.attribs.href, true);
      delete urlObj.query['ionicCachebuster'];
      delete urlObj.search; // or url.format will ignore modified `query`
      el.attribs.href = url.format(urlObj);
    });

    fs.writeFileSync(indexPath, $.html());
    q.resolve();
  } catch (e) {
    log.error('Unable to remove cachebusters from index.html asset urls. Err: ' + e);
    q.reject(e);
  }
  return q.promise;
};
