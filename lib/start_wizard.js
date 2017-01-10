var Q = require('q');
var chalk = require('chalk');
var http = require('http');
var connect = require('connect');
var serveStatic = require('serve-static');
var finalhandler = require('finalhandler');
var request = require('request');
var spawn = require('cross-spawn');
var path = require('path');
var fs = require('fs');

var log = require('./logging').logger;
var ports = require('./ports');
var Utils = require('./utils');

var Start = require('./start');
var Login = require('./login');

var DEFAULT_HTTP_PORT = 8900;

function getBody(req, cb) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    cb(body);
  });
}

function handleApiCli(req, res, cwd) {
  getBody(req, function(body) {

    var d = JSON.parse(body);

    try {
      var fullPath = d.app.path || path.join(cwd, d.app.directory);
      if (fs.existsSync(fullPath)) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end('{"status": "error", "data": "Directory already exists. Please use a unique app directory name"}');
        return;
      }

      Start.startApp({
         appDirectory: d.app.directory,
         appName: d.app.name,
         packageName: d.app.id,
         isCordovaProject: true,
         template: d.app.template,
         targetPath: fullPath,
         v2: true
      })
      .then(function() {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end('{"status": "success", "data": { "fullPath": "' + (fullPath) + '"}}');
      })
      .catch(function(error) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end('{"status": "error", "data": "' + error.message + '"}');
        log.error(error);
      });
    } catch(e) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end('{"status": "error", "data": "' + e.message + '"}');
      log.error(e);
    }

  });

}

function handleApiEnv(req, res) {
  var appDirectory = process.cwd();

  Login.retrieveLogin().then(function(login) {
    var hasLogin = !!login;
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      cwd: appDirectory,
      loggedIn: hasLogin
    }));
  }, function(err) {
  });
}

function handleApiRun(req, res) {
  getBody(req, function(body) {
    try {
      var d = JSON.parse(body);

      var ps = spawn('ionic', ['lab'], {
        cwd: d.fullPath
      });
      ps.stdout.on('data', (data) => {
        var d = data.toString('utf-8');
        if(d.indexOf('dev server running') >= 0) {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({
            'status': 'success'
          }));
        }
        process.stdout.write(d);
      });
      ps.stderr.on('data', (data) => {
        process.stderr.write(data.toString('utf-8'));
      });
      ps.on('error', function(err) {
        console.error('Spawn error', err);
      });
      ps.on('close', (code) => {
        console.log(`Run process exited with code ${code}`);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          'status': 'error'
        }));
      });
    } catch(e) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end('{"status": "error", "data": "' + e.message + '"}');
      log.error(e);
    }
  });
}

function handleApiLogin(req, res) {
  getBody(req, function(body) {

    var d = JSON.parse(body);

    var promise;

    promise = Q({ email: d.email, password: d.password });

    return promise
    .then(function(loginInfo) {
      return Login.requestLogIn(d.email, d.password, true);
    })
    .then(function(cookieJar) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end('{"status": "success"}');
      return cookieJar;
    }, function(err) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end('{"status": "error", "data": "' + err + '"}');
    })
    .catch(function(ex) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      log.error(ex);
    });
  });
}

function handleApiSignup(req, res) {
  getBody(req, function(body) {
    var d = JSON.parse(body);

    var promise;

    promise = Q({ email: d.email, password: d.password });

    return promise
    .then(function(loginInfo) {
      return Login.requestSignup(d, true);
    })
    .then(function(cookieJar) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end('{"status": "success"}');
      return cookieJar;
    }, function(signupRes) {
      log.error(signupRes[1]);
      log.error('Unable to signup, see error above');
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end('{"status": "error", "data": ' + signupRes[1] + '}');
    })
    .catch(function(ex) {
      log.error(ex);
    });
  });
}


/*
function handleApiSurvey(req, res) {
  getBody(req, function(body) {
    Login.retrieveLogin().then(function(jar) {
      request({
        method: 'GET',
        proxy: proxy,
        uri: settings.IONIC_DASH_API + 'user/survey',
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
        }
      });
    });
  });
}
*/

function getPort() {
  var q = Q.defer();
  var testPort = DEFAULT_HTTP_PORT;
  ports.getPort({ port: testPort, host: '0.0.0.0'}, function(err, port) {
    if (err) {
      return q.reject(err);
    }
    q.resolve(port);
  });
  return q.promise;
}

module.exports = {
  start: function() {
    var q = Q.defer();

    var cwd = process.cwd();
    var app = connect();

    console.log('Starting Ionic Project wizard...');
    console.log('Using directory as root:', cwd);

    var serve = serveStatic(__dirname + '/assets/wizard');
    var server = http.createServer(function(req, res) {
      var done = finalhandler(req, res);

      if(req.url == '/api/env') {
        handleApiEnv(req, res);
        return;
      }
      if(req.url == '/api/cli') {
        handleApiCli(req, res, cwd);
        return;
      }
      if(req.url == '/api/run') {
        handleApiRun(req, res, cwd);
        return;
      }
      if(req.url == '/api/signup') {
        handleApiSignup(req, res);
        return;
      }
      if(req.url == '/api/login') {
        handleApiLogin(req, res);
        return;
      }
      /*
      if(req.url == '/api/survey') {
        handleApiSurvey(req, res);
        return;
      }
      */

      serve(req, res, done);
    });

    // Listen
    app.use(server);

    getPort().then(function(port) {
      try {
        runningServer = app.listen(port, '0.0.0.0');
      } catch (ex) {
        Utils.fail('Failed to start the Ionic Wizard server. Try using the full ionic start command instead\n' + ex.message);
      }

      log.info('√ Running start wizard: ', chalk.cyan('http://localhost:' + port + '/'));

      var open = require('open');

      try {
        open('http://localhost:' + port);
      } catch (ex) {
        log.error('Error opening the browser - ', ex);
      }
    }, function(err) {
      Utils.fail('Unable to start wizard server');
      console.error(err);
    }).catch(function(err) {
      console.error('ERROR', err);
    })

    return q.promise;
  }
}
