const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static('public'));
server.listen(8080, () => {
  console.log('Running on localhost:8080');
});

const Hub = require('./hub');
const hub = new Hub();
const requestPlayer = require('./message-handlers/request-player');

hub.registerMessageHandler('requestPlayer', requestPlayer);

io.on('connection', hub.listenToIdentity.bind(hub));
