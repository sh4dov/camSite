(function () {
    var childProcess = require('child_process');
    var util = require('util');
    var events = require('events');

    var Mpeg1Converter = function (options) {
        var self = this;
        var timeout = 10000;
        var endOfStreamHandler;
        this.url = options.url;
        this.stream = childProcess.spawn("ffmpeg", ["-rtsp_transport", "tcp", "-i", this.url, '-f', 'mpeg1video', '-b:v', '800k', '-r', '30', '-'], {
            detached: false
        });

        function endOfStream() {
            return self.emit('endOfStream');
        }

        function setEndOfStreamTimeout() {
            clearTimeout(endOfStreamHandler);
            endOfStreamHandler = setTimeout(endOfStream, timeout);
        }

        this.stream.stdout.on('data', function (data) {
            setEndOfStreamTimeout();
            return self.emit('data', data);
        });

        this.stream.stderr.on('data', function (data) {
            setEndOfStreamTimeout();
            return self.emit('metaData', data);
        });

        return this;
    }

    util.inherits(Mpeg1Converter, events.EventEmitter);

    Mpeg1Converter.prototype.close = function () {
        this.stream.kill();
    }

    module.exports = Mpeg1Converter;
}).call(this);