console.log("Starting server...");
// Import the Express module
var express = require('express');

// Import the 'path' module (packaged with Node.js)
var path = require('path');

// Create a new instance of Express
var app = express();

// Import the Anagrammatix game file.
var qs = require('./gameserver');

// Serve static html, js, css, and image files from the 'public' directory
var publicPath = path.join(__dirname,'../public');
app.use(express.static(publicPath));
console.log("Serving static files from " + publicPath);

// Create a Node.js based http server on port 8080
var server = require('http').createServer(app).listen(process.env.PORT || 8080);

// Create a Socket.IO server and attach it to the http server
var io = require('socket.io').listen(server);

// Reduce the logging output of Socket.IO
io.set('log level',1);

qs.initGame(io);
io.sockets.on('connection', function (socket) {
    qs.initClient(socket);
});
console.log("Server started");

// Example comment