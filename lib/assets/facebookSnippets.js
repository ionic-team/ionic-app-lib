$scope.logInSuccessfully = function(loginStatus) {
  console.log('Did it', loginStatus);
}

$scope.logInError = function(error) {
  console.log('Failed', error)
}

$scope.login = function() {
  facebookConnectPlugin.login(['email'], $scope.logInSuccessfully, $scope.logInError);
}
