angular.module('app').directive('camHost',
    function () {
        return {
            templateUrl: '/app/directives/templates/camHost.html',
            restrict: 'E',
            link: function (scope) {
                var returnToOverviewTimeout = 10000;
                var returnToOverviewHandler;
                scope.cams = [];
                scope.isSingleMode = false;

                scope.$on('camViewSelecting', function (event, source) {
                    clearTimeout(returnToOverviewHandler);

                    scope.cams.forEach(function (cam) {
                        if (cam != source) {
                            cam.selected = false;
                        }
                    });

                    scope.isSingleMode = source.selected;

                    if (scope.isSingleMode) {
                        returnToOverviewHandler = setTimeout(function () {
                            scope.cams.forEach(function (cam) { cam.selected = false; });
                            scope.isSingleMode = false;
                            scope.$apply();
                        }, returnToOverviewTimeout);
                    }
                });
            }
        }
    }
);