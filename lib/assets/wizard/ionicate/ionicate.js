angular.module('ionicate', [])

.directive('ionicate', function() {
  return {
    restrict: 'E',
    scope: {
      questions: '=',
      onFinish: '&'
    },
    template: '<div class="ionicate-wrap">' +
                '<div class="ionicate-close"><a ng-click="close()"><i class="ion-close"></i></a></div>' +
                '<div class="ionicate-title">{{question.title}}</div>' +
                '<div class="ionicate-content">' +
                  '<ul class="ionicate-questions">' +
                    '<li ng-repeat="q in question.options" ng-click="selectOption($event, question, q)">' +
                      '<input type="checkbox" ng-model="q.selected"> {{q.title}}' +
                    '</li>' +
                    '<li ng-if="question.allowOther" ng-click="selectOption($event, question, q)">' +
                      '<input type="checkbox" ng-model="q.selected"> Other' +
                    '</li>' +
                  '</ul>' +
                '</div>' +
                '<div class="ionicate-button"><a ng-click="submit()">Submit</a></div>' +
              '</div>',
    link: function($scope) {
      $scope.results = [];
      console.log('LINKED', $scope);

      $scope.questionIndex = -1;

      $scope.nextQuestion = function() {
        $scope.question = $scope.questions[++$scope.questionIndex];
      }

      $scope.nextQuestion();

      $scope.selectOption = function(e, question, q) {
        console.log('SELECT', e, question, q);
        // Let input do it's thang
        if(e.target.nodeName == "INPUT") { return; }

        q.selected = !!!q.selected;
      };

      $scope.close = function() {
        $scope.onFinish({
          didFinish: false
        });
      }

      $scope.submit = function() {
        $scope.nextQuestion();
      }
    }
  }
})
