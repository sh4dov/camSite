angular.module('app').directive('camHost',
    function ($http) {
        return {
            templateUrl: '/app/directives/templates/camHost.html',
            restrict: 'E',
            link: function (scope) {
                var returnToOverviewTimeout = 10000;
                var checkCamerasInterval = 60000;
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

                function updateCamUrls() {
                    for (var i in scope.camUrls) {
                        var cam = scope.camUrls[i];
                        var camView = scope.cams[i];
                        if (camView && !camView.connected) {
                            camView.url = cam.url;
                            camView.connect(true);
                        }
                    }
                }

                function getCameras() {
                    $http.get('/api/cameras')
                        .success(function (data) {
                            scope.camUrls = data;
                            updateCamUrls();
                        });
                }
                getCameras();

                scope.$watchCollection('cams', function () {
                    updateCamUrls();
                });

                setInterval(function () {
                    if (scope.cams.filter(function (cam) { return !cam.connected; }).length > 0) {
                        getCameras();
                    }
                }, checkCamerasInterval);
            }
        }
    }
);