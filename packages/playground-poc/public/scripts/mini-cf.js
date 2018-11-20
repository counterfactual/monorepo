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
      // TODO: Better define this payload.
      peerAddress,
      terms,
      appDefinition: this.appDefinition
      // appID: this.appDefinition.address
    });
  }

  // TODO: Why "rejectInstall" isn't defined here in the API reference?
  rejectInstall(peerAddress, terms) {
    this.client.nodeProvider.emit('rejectInstall', {
      peerAddress,
      terms,
      appDefinition: this.appDefinition
      // TODO: Should we use this here too?
      // appID: this.appDefinition.address
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
      'install',
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
          window.postMessage('cf-node-provider:ready');
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

var cf = { Client: Client };

