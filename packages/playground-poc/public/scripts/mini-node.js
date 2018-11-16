class PlaygroundMessageChannel {
  constructor() {
    this.source = {};
    this.destination = {};
  }
}

class MessagingService {
  // channel as in web-sockets
  createChannel() {
    var messageChannel = new PlaygroundMessageChannel();

    // port1: is the dApp
    // port2: is Firebase, the other party, etc.

    return messageChannel;
  }
}

// is this akin to the old Wallet class?
// Is Metamask a "node"?
// It should be able to listen *some* messages.
// Some are handled, some are relayed via MessasingService.
// Playground should listen to install and then open the app.
// How? Do we have its URL somewhere? Maybe in the manifest?
class PlaygroundNode {
  constructor() {
    this.messagingService = new MessagingService();
  }
}

