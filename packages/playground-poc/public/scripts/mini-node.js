class PlaygroundNode {
  constructor() {
    this.appWhitelist = [];
  }

  async openApp(appID) {
    const eventEmitter = new EventEmitter3.EventEmitter();

    return Promise.resolve(eventEmitter);
  }
}
