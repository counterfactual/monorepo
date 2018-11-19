class AppFactory {
  constructor(client, appDefinition) {
    /**
     * @type Client
     */
    this.client = client;
    this.appDefinition = appDefinition;
  }

  proposeInstall(peerAddress, terms) {
    this.client.nodeProvider.emit('proposeInstall', {
      peerAddress,
      terms,
      appDefinition: this.appDefinition
    });
  }

  rejectInstall(peerAddress, terms) {
    this.client.nodeProvider.emit('rejectInstall', {
      peerAddress,
      terms,
      appDefinition: this.appDefinition
    });
  }
}

class Client extends EventEmitter3.EventEmitter {
  constructor(nodeProvider) {
    super();

    /**
     * @type NodeProvider
     */
    this.nodeProvider = nodeProvider;

    const messages = [
      'proposeInstall',
      'rejectInstall',
      'rejectedInstall' // Used for notifying the other party
    ];

    messages.forEach(this.bindMessage.bind(this));
  }

  bindMessage(message) {
    this.nodeProvider.on(message, (event) => {
      this.emit(event.type, event);
    });
  }

  createAppFactory(appDefinition) {
    return new AppFactory(this, appDefinition);
  }
}

class NodeProvider {
  constructor() {
    this.eventEmitter = new EventEmitter3.EventEmitter();
  }

  async connect() {
    return new Promise((resolve) => {
      window.addEventListener('message', (event) => {
        if (event.data === 'cf-node-provider:port') {
          this.messagePort = event.ports[0];
          this.messagePort.addEventListener('message', (event) => {
            this.eventEmitter.emit(event.data.type, event.data);
          });
          this.messagePort.start();
          resolve(this);
        }
      });

      window.postMessage('cf-node-provider:init', '*');
    });
  }

  emit(eventName, data) {
    this.messagePort.postMessage({ type: eventName, ...data });
  }

  on(eventName, callback) {
    this.eventEmitter.on(eventName, callback);
  }

  once(eventName, callback) {
    this.eventEmitter.once(eventName, callback);
  }
}

var cf = { Client: Client }

