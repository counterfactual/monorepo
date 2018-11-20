class Dapp {
  constructor(manifest, socket) {
    this.manifest = manifest;
    this.socket = socket;
    this.ready = false;

    /**
     * @type {Window}
     */
    this.window = null;

    /**
     * @type {MessagePort}
     */
    this.port = null;

    this.messageQueue = [];
  }

  queueMessage(message) {
    this.messageQueue.push(message);
  }

  flushMessageQueue() {
    this.messageQueue.forEach((message) => this.port.postMessage(message));
  }

  bindToWindow(windowObject) {
    this.window = windowObject;
    this.window.addEventListener('message', this.configureMessageChannel.bind(this));
    this.window.addEventListener('load', () => { this.ready = true; });
  }

  configureMessageChannel(event) {
    if (event.data === 'cf-node-provider:init') {
      const { port2 } = this.configureMessagePorts();
      this.window.postMessage('cf-node-provider:port', '*', [port2]);
    }

    if (event.data === 'cf-node-provider:ready') {
      this.flushMessageQueue();
    }
  }

  configureMessagePorts() {
    const channel = new MessageChannel();

    this.port = channel.port1;
    this.port.addEventListener('message', this.relayMessageToSocket.bind(this));
    this.port.start();

    return channel;
  }

  relayMessageToSocket(event) {
    this.socket.emit('message', event.data);
  }
}

class Playground {
  constructor(appManifests) {
    this.iframes = {};
    this.socket = null;
    this.user = null;
    this.appManifests = appManifests;
  }

  showAppList() {
    Object.keys(this.appManifests).forEach((appID) => {
      const button = document.createElement('button');
      const manifest = this.appManifests[appID];
      button.innerText = manifest.name;
      button.addEventListener('click', () => this.loadApp(manifest, document.body));
      document.getElementById('dapp-list').appendChild(button);
    });
  }

  setSocket(address) {
    this.socket = io.connect('http://localhost:8080');
    this.socket.on('connect', this.relayIdentity.bind(this, address));
    this.user = address;
    this.socket.on('message', this.passMessageToDapp.bind(this));
    document.getElementById('current-user').innerText = address;
  }

  relayIdentity(address) {
    this.socket.emit('identity', { address });
  }

  reply(originalMessage, data = {}) {
    const message = Object.assign({}, originalMessage, data);

    message.peerAddress = originalMessage.fromAddress;
    delete message.fromAddress;

    this.socket.emit('message', message);
  }

  // TODO: proposeInstalL/rejectInstall require special handling that
  // can occur while the other party's dApp is closed. Who's responsible
  // for these events?
  passMessageToDapp(data) {
    if (data.type === 'proposeInstall' && data.peerAddress === this.user) { // This goes to a Node
      // The callback is Playground's.
      vex.dialog.confirm({
        message: `Do you want to install ${data.appDefinition.name}?`,
        callback: (value) => {
          if (value) {
            this.reply(data, { type: 'install' });
            this.socket.emit('message', Object.assign({}, data, { type: 'install' }));
          } else {
            this.reply(data, { type: 'rejectInstall' });
          }
        }
      });
      // return; // TODO: Is it OK to *not* pass through the message?
    }

    if (data.type === 'install') {
      this.loadApp(data.appDefinition, document.body);
    }

    if (data.type === 'rejectInstall') { // This goes to a Node
      // The callback is Playground's.
      vex.dialog.alert(`${data.fromAddress} rejected your install proposal.`);
      return; // TODO: Is it OK to *not* pass through the message?
    }

    // Playground relays to the proper iframe.
    const address = data.appDefinition.address;
    const dapp = this.iframes[address];
    if (this.isAppLoading(address)) {
      dapp.queueMessage(data);
    } else if (this.isAppLoaded(address)) {
      dapp.port.postMessage(data);
    }
  }

  /**
   * @param {manifest} Object
   * @param {Element} parentNode
   */
  loadApp(manifest, parentNode) {
    if (this.isAppLoaded(manifest.address) || this.isAppLoading(manifest.address)) {
      return;
    }

    const iframe = document.createElement('iframe');

    iframe.id = manifest.address;
    iframe.src = manifest.url;

    parentNode.appendChild(iframe);

    const dapp = new Dapp(manifest, this.socket);
    dapp.bindToWindow(iframe.contentWindow);

    this.iframes[iframe.id] = dapp;
  }

  isAppLoaded(address) {
    const app = this.iframes[address];
    return app && app.ready;
  }

  isAppLoading(address) {
    const app = this.iframes[address];
    return app && !app.ready;
  }
}
