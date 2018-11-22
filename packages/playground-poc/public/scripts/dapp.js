class Dapp {
  constructor(manifest, socket) {
    this.manifest = manifest;
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

  async open(node) {
    this.events = await node.openApp(this.address);
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
      this.events.emit('ready');
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
