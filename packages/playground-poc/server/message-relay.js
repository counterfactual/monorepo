// MessageRelay will become the Hub

module.exports = class MessageRelay {
  constructor(io) {
    this.io = io;
    this.addressToSockets = {};
    this.socketsToAddress = {};
    this.messageHandlers = {
      requestPlayer: [],
    };
  }

  registerMessageHandler(type, handler) {
    this.messageHandlers[type].push(handler);
  }

  routeMessage(data, source) {
    if (!data || !data.type) {
      return;
    }

    const socket = this.addressToSockets[data.peerAddress];

    // TODO: Is it OK to auto-attach a "fromAddress"?
    // Should we consider another way for peers to talk to each other?
    data.fromAddress = source;

    if (data.type in this.messageHandlers) {
      this.messageHandlers[data.type].forEach(handler => handler.bind(this)(data, source));
      return;
    }

    console.log('----------------------------------------------------------------------------');
    console.log('Incoming message from: ', source);
    console.log('Attempting to route:', data);
    console.log('Socket available:', !!socket, ' - Will use broadcast mode?', !!!socket);
    console.log('----------------------------------------------------------------------------');

    if (socket) {
      console.log('Sending via socket', socket.id, ' to ', data.peerAddress, ' a message: ', data);
    } else {
      console.log('Broadcasting: ', data);
    }

    // If we can't route, we'll scream and shout...
    (socket || this.io.sockets).emit('message', data);
  }

  bindSocketEvents(socket) {
    socket.on('message', (data) => this.routeMessage(data, this.socketsToAddress[socket.id]));
  };

  bindSocketToAddress(socket, address) {
    this.addressToSockets[address] = socket;
    this.socketsToAddress[socket.id] = address;
    console.log('Socket ', socket.id, ' is now bound to ', address);
    this.bindSocketEvents(socket);
  };

  listenToIdentity(socket) {
    socket.on('identity', (data) => this.bindSocketToAddress(socket, data.address));
  };
}
