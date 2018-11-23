const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static('public'));

server.listen(8080, () => {
  console.log('Running on localhost:8080');
});

const MessageRelay = require('./message-relay');
const messageRelay = new MessageRelay(io);
const requestPlayer = require('./message-handlers/request-player');

messageRelay.registerMessageHandler('requestPlayer', requestPlayer);

io.on('connection', messageRelay.listenToIdentity.bind(messageRelay));
