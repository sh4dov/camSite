(function () {
    var fs = require('fs');
    var portFinder = require('portfinder');
    var dateFormat = require('dateformat');
    var VideoStream = require('./videoStream');
    var onvif = require('onvif');
    var Cam = onvif.Cam;

    var CHECK_CLIENTS_TIMEOUT = 60000;

    // credentials is in json format: { "username": "user name", "password": "cam password" }
    var credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));

    var CamServer = function () {
        this.cams = [];
        portFinder.basePort = 8084;
        this.discoverCams();
        this.checkClients();
    }

    CamServer.prototype.discoverCams = function () {
        var self = this;
        var newCams = [];
        this.log('Discovering cameras...');
        onvif.Discovery.probe(function (err, cams) {
            if (err) {
                self.log('Error: ' + JSON.stringify(err));
                return;
            }

            cams.forEach(function (cam) {
                self.log('Discovered camera: ' + cam.hostname);
                cam.username = credentials.username;
                cam.password = credentials.password;

                new Cam(cam, function (err) {
                    if (err) {
                        self.log('Error: ' + JSON.stringify(err));
                        return;
                    }

                    this.getStreamUri({ protocol: 'RTSP' }, function (streamErr, stream) {
                        if (streamErr) {
                            self.log('Error: ' + JSON.stringify(streamErr));
                            return;
                        }

                        self.log('Camera ' + cam.hostname + ' has stream at ' + stream.uri);
                        newCams.push({
                            hostname: cam.hostname,
                            uri: stream.uri
                        });

                        if (cam === cams[cams.length - 1]) {
                            self.updateCams(newCams);
                        }
                    });
                });
            });
        });
    }

    CamServer.prototype.log = function (logEntry) {
        console.log(dateFormat(new Date(), 'yyyy-mm-dd hh:MM:ss') + ' Cam server: ' + logEntry);
    }

    CamServer.prototype.updateCams = function (newCams) {
        var self = this;
        this.log('updating cameras: ' + JSON.stringify(newCams));
        var existingCams = this.cams.filter(function (cam) {
            return newCams.filter(function (newCam) { return cam.hostname == newCam.hostname; }).length > 0;
        });
        var oldCams = this.cams.filter(function (cam) {
            return newCams.filter(function (newCam) { return cam.hostname == newCam.hostname; }).length == 0;
        });
        newCams = newCams.filter(function (newCam) {
            return self.cams.filter(function (cam) { return cam.hostname == newCam.hostname; }).length == 0;
        });

        oldCams.forEach(function (cam) {
            self.log('Removing old cam: ' + cam.hostname);
            cam.videoStream.close();
            self.cams.splice(this.cams.indexOf(cam));
        });

        existingCams.forEach(function (cam) {
            if (!cam.videoStream.initialized) {
                self.log('Reconnecting cam: ' + cam.hostname);
                cam.videoStream.reconnect();
            }
        });

        newCams.forEach(function (cam) {
            portFinder.getPort(function (err, port) {
                cam.port = port;
                cam.videoStream = new VideoStream({ url: cam.uri, wsPort: port, name: 'cam:' + port });
                self.log('New camera ' + cam.hostname + ' available at port ' + port);
                self.cams.push(cam);
            });
        });
    }

    CamServer.prototype.checkClients = function () {
        var self = this;
        this.cams.forEach(function (cam) {
            if (cam.videoStream.initialized && cam.videoStream.getNumberOfClients() == 0) {
                cam.videoStream.close();
            }
        });

        setTimeout(function () {
            self.checkClients();
        }, CHECK_CLIENTS_TIMEOUT);
    }

    module.exports = CamServer;
}).call(this);