(function () {
    var util = require('util');
    var events = require('events');
    var ws = require('ws');
    var dateFormat = require('dateformat');
    var Mpeg1Converter = require('./mpeg1converter');
    var TIMEOUT = 10000;

    var VideoStream = function (options) {
        this.url = options.url;
        this.wsPort = options.wsPort;
        this.name = options.name || 'noname';
        this.initialize();
    }

    util.inherits(VideoStream, events.EventEmitter);

    VideoStream.prototype.log = function (logEntry) {
        console.log(dateFormat(new Date(), 'yyyy-mm-dd hh:MM:ss') + ' ' + this.name + ': ' + logEntry);
    }

    VideoStream.prototype.initialize = function () {
        var self = this;
        this.initialized = false;
        this.converter = new Mpeg1Converter({ url: this.url });
        this.log('Connecting to stream server: ' + this.url);

        this.converter.on('metaData', function (data) {
            self.onMetaData(data);
        });

        this.converter.on('endOfStream', function () {
            if (self.getNumberOfClients() > 0) {
                self.reconnect();
            }
        });
    }

    VideoStream.prototype.reconnect = function () {
        var self = this;

        this.close();

        setTimeout(function () { self.initialize(); }, TIMEOUT);
    }

    VideoStream.prototype.close = function () {
        this.log('Disconnected from stream server: ' + this.url);
        if (this.wsServer) {
            this.wsServer.clients.forEach(function (client) { client.close(); });
            this.wsServer.close();
        }
        this.converter.close();
        this.initialized = false;
    }

    VideoStream.prototype.onMetaData = function (data) {
        data = data.toString();
        if (!this.initialized) {
            this.metaData = this.metaData + data;
            data = this.metaData;
        } else {
            this.metaData = "";
        }

        if (data.indexOf('Input #') !== -1) {
            //console.log('data:\r\n' + data);
            this.initialized = this.getDimensions(data);
        }
        else if (data.indexOf('frame=') !== -1) {
        } else {
            //console.log('data:\r\n' + data);
        }
    }

    VideoStream.prototype.getDimensions = function (data) {
        var result = data.match(/(\d+)x(\d+)/);
        if (result && result.length > 1) {
            this.width = +result[1];
            this.height = +result[2];
            global.process.stderr.write(dateFormat(new Date(), 'yyyy-mm-dd hh:MM:ss') + ' ' + this.name + ': Video resolution: ' + this.width + 'x' + this.height + '\r\n');
            this.startServer();
            return true;
        }

        return false;
    }

    VideoStream.prototype.startServer = function () {
        var self = this;

        this.wsServer = new ws.Server({ port: this.wsPort });
        this.log('Started server at port: ' + this.wsPort + ' streaming data from: ' + this.url);

        this.wsServer.on('connection', function (socket) {
            self.onSocketConnected(socket);
        });

        this.wsServer.on('error', function (error) {
            self.log(error.toString());
            self.reconnect();
        });

        this.wsServer.broadcast = function (data, opts) {
            var results = [];
            for (var i in this.clients) {
                var client = this.clients[i];
                if (client.readyState === 1) {
                    results.push(client.send(data, opts));
                } else {
                    results.push(console.log(self.name + ': Error: client (' + i + ') not connected.'));
                }
            }

            return results;
        }

        return this.converter.on('data', function (data) {
            return self.wsServer.broadcast(data);
        });
    }

    VideoStream.prototype.onSocketConnected = function (socket) {
        var self = this;
        var header = new Buffer(8);
        header.write('jsmp');
        header.writeUInt16BE(this.width, 4);
        header.writeUInt16BE(this.height, 6);

        this.log('New connection (' + this.wsServer.clients.length + ' total)');
        socket.send(header, { binary: true });

        socket.on('close', function () {
            self.log('Client disconnected (' + self.wsServer.clients.length + ' total)');
        });
    }

    VideoStream.prototype.getNumberOfClients = function () {
        if (!this.wsServer) {
            return 0;
        }
        return this.wsServer.clients.length;
    }

    module.exports = VideoStream;
}).call(this);