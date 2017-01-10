angular.module('ionicate', [])

.directive('ionicate', function() {
  return {
    restrict: 'E',
    scope: {
      questions: '=',
      onFinish: '&',
      onClose: '&'
    },
    template: '<div class="ionicate-wrap">' +
                '<div class="ionicate-close"><a ng-click="close()"><i class="ion-close"></i></a></div>' +
                '<div class="ionicate-title" ng-if="question">{{question.title}}</div>' +
                '<div class="ionicate-title" ng-if="!question">{{done.title}}</div>' +
                '<div class="ionicate-content">' +
                  '<div class="ionicate-done" ng-if="!question">' +
                    '{{done.text}}' +
                  '</div>' +
                  '<ul class="ionicate-questions" ng-if="question">' +
                    '<li ng-repeat="q in question.options" ng-click="selectOption($event, question, q)">' +
                      '<input type="checkbox" ng-model="q.$value"> {{q.title}}' +
                    '</li>' +
                    '<li ng-if="question.allowOther" ng-click="selectOption($event, question, q)">' +
                      '<input type="checkbox" ng-model="question.$showOther"> Other' +
                      '<div class="ionicate-other-input"><input type="text" ng-model="question.$otherValue" autofocus ng-if="question.$showOther"></div>' +
                    '</li>' +
                  '</ul>' +
                '</div>' +
                '<div class="ionicate-button"><a ng-click="submit()">Submit</a></div>' +
              '</div>',
    link: function($scope) {
      $scope.results = [];
      console.log('LINKED', $scope);

      $scope.questionIndex = -1;
      $scope.done = $scope.questions && $scope.questions.done;

      $scope.nextQuestion = function() {
        $scope.question = $scope.questions.questions[++$scope.questionIndex];
        if(!$scope.question) {
          $scope.onFinish({
            results: $scope.getResults()
          });
        }
      }

      $scope.getResults = function() {
        var qs = $scope.questions && $scope.questions.questions;
        if(!qs) { return {}; }

        var results = {};

        for(var i = 0; i < qs.length; i++) {
          var q = qs[i];
          var opts = q.options;
          var o;
          var qResults = []
          for(var j = 0; j < opts.length; j++) {
            o = opts[j];
            if(o.$value) {
              qResults.push({
                title: o.title,
                value: o.$value
              });
            }
          }

          if(q.$otherValue) {
            qResults.push({
              title: 'Other',
              value: q.$otherValue
            });
          }

          if(qResults.length) {
            results[q.tag] = qResults;
          }
        }

        return results;
      }

      $scope.nextQuestion();

      $scope.selectOption = function(e, question, q) {
        console.log('SELECT', e, question, q);
        // Let input do it's thang
        if(e.target.nodeName == "INPUT") { return; }

        q.selected = !!!q.selected;
      };

      $scope.close = function() {
        $scope.onClose();
      }

      $scope.submit = function() {
        $scope.nextQuestion();
      }
    }
  }
})
