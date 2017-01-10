angular.module('app', ['ngAnimate', 'ngSanitize'])

.run(['$rootScope', '$http', function($rootScope, $http) {
}])

.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {
  $scope.loading = false;
  $scope.loadingMessage = 'Loading...';
  $scope.step = 1;
  $scope.isAuthenticated = false;

  $scope.app = {
    name: 'My App',
    directory: 'myApp',
    path: '',
    id: generateId(),
    template: 'tabs'
  };
  function generateId() {
    var packageName = '' + Math.round((Math.random() * 899999) + 100000);
    packageName = 'com.ionicframework.app' + packageName.replace(/\./g, '');
    return packageName;
  }


  $scope.env = {
    cwd: ''
  };
  $http.get('/api/env').then(function(res) {
    $scope.env = res.data;
    $scope.isAuthenticated = $scope.env.loggedIn;
  });

  $scope.nextStep = function() {
    ++$scope.step;
  };
  $scope.setStep = function(step) {
    $scope.step = step;
  };

  $scope.startLoading = function(loadingMessage, loadingMessageInfo) {
    $scope.loading = true;
    $scope.loadingMessage = loadingMessage;
    $scope.loadingMessageInfo = loadingMessageInfo;
  };
  $scope.endLoading = function() {
    $scope.loading = false;
  };

  $scope.setAuthenticated = function(isAuthenticated) {
    $scope.isAuthenticated = isAuthenticated;
  }
}])

.controller('CreateCtrl', ['$scope', '$http', function($scope, $http) {
  $scope.userModifiedDirectory = false;

  function generateDirectory(name) {
    return name.trim()
      .toLowerCase()
      .replace(/([^A-Z0-9]+)(.)/ig,
      function(match) {
        return arguments[2].toUpperCase();  //3rd index is the character we need to transform uppercase
      });
  }

  $scope.$watch('app.name', function(nv, ov) {
    console.log('App name', nv);
    if(!$scope.userModifiedDirectory) {
      $scope.app.directory = generateDirectory(nv);
    }
  })

  $scope.onSubmit = function() {
    $scope.errors = null;
    $scope.startLoading('Creating app...', 'See terminal for output');
    $http.post('/api/cli', {
      command: 'start',
      app: $scope.app
    }).then(function(resp) {
      $scope.endLoading();
      if(resp.data.status == "error") {
        $scope.errors = resp.data.data;
      } else {
        $scope.errors = null;
        $scope.app.fullPath = resp.data.data.fullPath;
        console.log('loaded', resp.data.data);
        if($scope.env.loggedIn) {
          $scope.setStep(3);
        } else {
          $scope.nextStep();
        }
      }
    }, function(err) {
      $scope.endLoading();
      $scope.errors = err.message;
      console.error('Unable to execute command', err);
    });
  }

}])

.controller('CloudCtrl', ['$scope', '$http', function($scope, $http) {
  $scope.data = {
    name: '',
    username: '',
    email: '',
    password: ''
  };

  $scope._showLogin = false;
  $scope.showLogin = function() {
    $scope._showLogin = true;
  }
  $scope.showSignup = function() {
    $scope._showLogin = false;
  }

  $scope.skip = function() {
    $scope.nextStep();
  }

  $scope.doLogin = function() {
    $scope.errors = {};
    $scope.disabled = true;
    $scope.startLoading('Logging in...');
    $http.post('/api/login', {
      email: $scope.data.email,
      password: $scope.data.password
    }).then(function(resp) {
      console.log('Login resp', resp);
      $scope.endLoading();
      $scope.disabled = false;
      $scope.setAuthenticated(true);
      $scope.nextStep();
    }, function(err) {
      $scope.endLoading();
      $scope.disabled = false;
      console.error('Error logging in ', err);
      console.error('asdfasdf', err.data);
      $scope.errors = {
        email: [err.data && err.data.data]
      };
    });
  };

  $scope.doSignup = function() {
    $scope.errors = {};
    $scope.singleError = null;
    $scope.startLoading('Creating ID...', 'See terminal for output');
    $scope.disabled = true;
    $http.post('/api/signup', {
      username: $scope.data.username,
      name: $scope.data.name,
      company: $scope.data.company,
      email: $scope.data.email,
      password: $scope.data.password
    }).then(function(resp) {
      $scope.setAuthenticated(true);
      $scope.endLoading();
      $scope.disabled = false;
      $scope.nextStep();
    }, function(err) {
      $scope.endLoading();
      $scope.disabled = false;
      console.error('Unable to signup', err);
      $scope.errors = err.data && err.data.data;
      if(!$scope.errors) {
        $scope.singleError = 'Unable to sign up. Please check the console for more errors and try again.';
      }
    }).catch(function(err) {
      $scope.endLoading();
      $scope.disabled = false;
      console.error('Unable to signup', err);
      $scope.errors = err.data && err.data.data;
    });
  };
}])
.controller('LaunchCtrl', ['$scope', '$http', function($scope, $http) {
  $scope.launched = false;
  $scope.runApp = function() {
    $scope.startLoading('Launching app...', 'Running <code>ionic lab</code>');
    $http.post('/api/run', $scope.app).then(function(resp) {
      $scope.endLoading();
      $scope.launched = true;
    }).catch(function(err) {
      $scope.endLoading();
      $scope.error = err;
      console.error('Unabe to run', err);
    });
  }
}])
