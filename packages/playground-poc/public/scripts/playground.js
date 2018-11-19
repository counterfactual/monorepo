class Dapp {
  constructor(id, socket) {
    /**
     * @type {string}
     */
    this.id = id;
    this.socket = socket;

    /**
     * @type {Window}
     */
    this.window = null;

    /**
     * @type {MessagePort}
     */
    this.port = null;
  }

  bindToWindow(windowObject) {
    this.window = windowObject;
    this.window.addEventListener('message', this.configureMessageChannel.bind(this));
  }

  configureMessageChannel(event) {
    if (event.data !== 'cf-node-provider:init') {
      return;
    }

    const { port2 } = this.configureMessagePorts();
    this.window.postMessage('cf-node-provider:port', '*', [port2]);
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
  constructor() {
    this.iframes = {};
    this.nextIFrameID = 1;
    this.socket = null;
    this.user = null;
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
    if (data.type === 'proposeInstall') {
      const install = confirm('Do you want to install?');
      if (!install) {
        this.reply(data, { type: 'rejectInstall' });
      } else {
        // TODO: How do I know which app to load?
        this.loadApp('dapp.html', document.body);
      }
      return; // TODO: Is it OK to *not* pass through the message?
    }

    if (data.type === 'rejectInstall') {
      alert(data.fromAddress + ' rejected your install proposal');
      return; // TODO: Is it OK to *not* pass through the message?
    }

    // Playground relays to the proper iframe. AppID plays here.
    // socket.emit('playground-message', { date: Date.now() });
    Object.keys(this.iframes).forEach(iframeID => {
      this.iframes[iframeID].port.postMessage(data);
    });
  }

  /**
   * @param {string} url
   * @param {Element} parentNode
   */
  loadApp(url, parentNode) {
    const iframe = document.createElement('iframe');

    // TODO: Is this something useful to identify a dApp across pears? Is it a local ID?
    iframe.id = `iframe-${this.nextIFrameID}`;
    iframe.src = url;

    parentNode.appendChild(iframe);

    const dapp = new Dapp(iframe.id, this.socket);
    dapp.bindToWindow(iframe.contentWindow);

    this.iframes[iframe.id] = dapp;
  }
}
