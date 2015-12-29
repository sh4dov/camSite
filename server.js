var express = require('express');
var camServer = new (require('./camServer/camServer'))();
var os = require('os');

var ifaces = os.networkInterfaces();
var ip = '';

Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
        }

        if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            console.log(ifname + ':' + alias, iface.address);
            ip = iface.address;
        } else {
            // this interface has only one ipv4 adress
            console.log(ifname, iface.address);
            ip = iface.address;
        }
        ++alias;
    });
});

var app = express();

app.use(express.static(__dirname + '/public'));

app.get('/api/cameras', function (req, res) {
    var result = [];
    for (var i in camServer.cams) {
        var cam = camServer.cams[i];
        result.push({ url: 'ws://' + ip + ':' + cam.port });
    }

    camServer.discoverCams();
    res.json(result);
});

app.get('*', function (req, res) {
    res.sendFile('./public/index.html');
});

app.listen(81);