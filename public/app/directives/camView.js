angular.module('app').directive('camView',
    function () {
        var id = 1;
        return {
            templateUrl: '/app/directives/templates/camView.html',
            restrict: 'E',
            replace: true,
            scope: {},
            link: function (scope, element) {
                scope.id = id++;
                scope.connected = false;
                scope.selected = false;
                scope.$parent.cams.push(scope);

                scope.toggleSelection = function () {
                    scope.selected = !scope.selected;
                    scope.$emit('camViewSelecting', scope);
                };

                scope.connect = function (skipDigest) {
                    scope.status = 'Connecting to camera ' + scope.id;

                    if (!scope.url) {
                        scope.status = 'Camera was not found ' + scope.id;
                        return;
                    }

                    var client = new WebSocket(scope.url);
                    client.onerror = function (event) {
                        scope.connected = false;
                        scope.status = 'Cannot connect to camera ' + scope.id;
                        scope.$apply();
                    };
                    client.onclose = function (event) {
                        scope.connected = false;
                        scope.status = 'Disconnected from camera ' + scope.id;
                        scope.$apply();
                        setTimeout(function () { scope.connect(); }, 10000);
                    }

                    var canvas = $(element).children('canvas')[0];
                    var player = new jsmpeg(client, { canvas: canvas });
                    player.onopen = function () {
                        scope.connected = true;
                        scope.$apply();
                    };

                    if (!skipDigest) {
                        scope.$apply();
                    }
                }

                scope.connect(true);
            }
        }
    }
);