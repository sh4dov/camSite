var VideoStream = require('./videoStream');
var stream = new VideoStream({ url: 'rtsp://192.168.1.128:554/12', wsPort: 8084, name: 'cam1' });