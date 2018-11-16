const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static('public'));
server.listen(8080, () => {
  console.log('Running on localhost:8080');
});

const addressToSockets = {};
const socketsToAddress = {};

const routeMessage = (data, source) => {
  if (!data || !data.type) {
    return;
  }

  const socket = addressToSockets[data.peerAddress];

  console.log('----------------------------------------------------------------------------');
  console.log('Incoming message from: ', source);
  console.log('Attempting to route:', data);
  console.log('Socket available:', !!socket, ' - Will use broadcast mode?', !!!socket);
  console.log('----------------------------------------------------------------------------');

  if (data.type === 'requestPlayer') {
    const allAddresses = Object.keys(addressToSockets).filter(connectedAddress => connectedAddress !== source);
    const randomIndex = Math.floor(Math.random() * allAddresses.length);
    const socket = addressToSockets[source];
    console.log('Matchmaking completed!', source, ' <3 ', allAddresses[randomIndex]);
    socket.emit('message', {
      type: 'matchedPlayer',
      data: {
        peerAddress: allAddresses[randomIndex]
      }
    });
    return;
  }

  if (socket) {
    console.log('Sending via socket', socket.id, ' to ', data.peerAddress, ' a message: ', data);
  } else {
    console.log('Broadcasting: ', data);
  }

  // If we can't route, we'll scream and shout...
  (socket || io.sockets).emit('message', data);
}

const bindSocketEvents = (socket) => {
  socket.on('message', (data) => routeMessage(data, socketsToAddress[socket.id]));
};

const bindSocketToAddress = (socket, address) => {
  addressToSockets[address] = socket;
  socketsToAddress[socket.id] = address;
  console.log('Socket ', socket.id, ' is now bound to ', address);
  bindSocketEvents(socket);
};

const listenToIdentity = (socket) => {
  socket.on('identity', (data) => bindSocketToAddress(socket, data.address));
};

io.on('connection', listenToIdentity);
