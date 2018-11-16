class AppFactory {
  constructor(client) {
    /**
     * @type Client
     */
    this.client = client;
  }

  proposeInstall(peerAddress, terms) {
    this.client.nodeProvider.postMessage('proposeInstall', { peerAddress, terms });
  }
}

class Client extends EventEmitter3.EventEmitter {
  constructor(nodeProvider) {
    super();

    /**
     * @type NodeProvider
     */
    this.nodeProvider = nodeProvider;

    this.nodeProvider.onMessage((event) => {
      this.emit(event.type, event);
    });
  }

  createAppFactory() {
    return new AppFactory(this);
  }
}

class NodeProvider {
  constructor() {
    this.subscribers = [];

    window.addEventListener('message', (event) => {
      if (event.data === 'cf-node-provider:port') {
        debugger;
        this.messagePort = event.ports[0];
        this.messagePort.onmessage = this.dispatchMessage.bind(this);
      }
    });
    window.postMessage('cf-node-provider:init', '*');
  }

  postMessage(type, data) {
    this.messagePort.postMessage({ type, ...data });
  }

  dispatchMessage(event) {
    if (!event.data.type) {
      return;
    }

    this.subscribers.forEach(function (callback) {
      callback(event.data);
    });
  }

  onMessage(callback) {
    this.subscribers.push(callback);
  }
}

var cf = { Client: Client }

