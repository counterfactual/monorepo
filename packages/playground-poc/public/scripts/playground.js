class Playground {
  constructor(appManifests) {
    this.iframes = {};
    this.socket = null;
    this.user = null;
    this.appManifests = appManifests;
    this.node = new PlaygroundNode();
    this.messageQueue = {};
  }

  queueMessage(address, message) {
    this.messageQueue[address].push(message);
  }

  flushMessageQueue(address) {
    (this.messageQueue[address] || []).forEach((message) => this.iframes[address].port.postMessage(message));
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
    this.socket.on('message', async (data) => await this.passMessageToDapp(data));
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

  async passMessageToDapp(data) {
    const address = data.appDefinition.address;
    const dapp = this.iframes[address] || await this.loadApp(data.appDefinition, document.body, true);

    // Playground relays to the proper iframe.
    if (!dapp.port) {
      this.queueMessage(address, data);
    } else {
      dapp.port.postMessage(data);
    }
  }

  /**
   * @param {manifest} Object
   * @param {Element} parentNode
   */
  async loadApp(manifest, parentNode, renderAfterInstall = false) {
    if (this.isAppLoaded(manifest.address)) {
      return;
    }

    const iframe = document.createElement('iframe');

    iframe.id = manifest.address;
    iframe.src = manifest.url;

    const dapp = new Dapp(manifest, this.socket);
    this.iframes[iframe.id] = dapp;

    await this.bindAppEvents(dapp);

    if (!renderAfterInstall) {
      parentNode.appendChild(iframe);
      dapp.bindToWindow(iframe.contentWindow);
    }
  }

  async bindAppEvents(dapp) {
    await dapp.open(this.node);

    dapp.events.on('proposeInstall', (data) => {
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
    });

    dapp.events.on('install', async (data) => {
      await this.loadApp(data.appDefinition, document.body, !renderAfterInstall);
    });

    dapp.events.on('rejectInstall', (data) => {
      vex.dialog.alert(`${data.fromAddress} rejected your install proposal.`);
    });

    dapp.events.once('ready', () => {
      this.flushMessageQueue(dapp.manifest.address);
    });
  }

  isAppLoaded(address) {
    const app = this.iframes[address];
    return app && app.ready;
  }
}
