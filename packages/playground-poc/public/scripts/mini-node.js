class PlaygroundNode {
  constructor() {
    this.appWhitelist = [];
    this.eventEmitters = {};
  }

  async openApp(appID) {
    this.eventEmitters[appID] = new EventEmitter3.EventEmitter();

    // Routing logic to a certain dApp should go here.
    return Promise.resolve(this.eventEmitters[appID]);
  }

  // Who's going to use this??
  proposeInstall(appID, data) {
    this.eventEmitters[appID].emit('proposeInstall', data);
  }

  install() {

  }

  rejectInstall() {

  }
}
