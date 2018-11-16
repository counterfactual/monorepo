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
      this.emit(event.data.type, event.data);
    });
  }

  createAppFactory() {
    return new AppFactory(this);
  }
}

class NodeProvider {
  async connect() {
    return new Promise((resolve) => {
      window.addEventListener('message', (event) => {
        if (event.data === 'cf-node-provider:port') {
          this.messagePort = event.ports[0];
          resolve(this);
        }
      });

      window.postMessage('cf-node-provider:init', '*');
    });
  }

  postMessage(type, data) {
    this.messagePort.postMessage({ type, ...data });
  }

  onMessage(callback) {
    this.messagePort.addEventListener('message', callback);
    this.messagePort.start();
  }
}

var cf = { Client: Client }

