export default class NodeProvider {
  constructor() {
    this.isConnected = false;
    this.callback = () => {};
  }

  onMessage(callback) {
    this.callback = callback;
  }

  sendMessage(message) {
    if (!this.isConnected) {
      // We fail because we do not have a messagePort available.
      throw new Error(
        "It's not possible to use postMessage() before the NodeProvider is connected. Call the connect() method first."
      );
    }
    console.log("message in", message);
    switch (message.type) {
      case "proposeInstallVirtual": {
        this.sendCallback({
          type: "proposeInstallVirtual",
          requestId: message.requestId,
          result: {
            appInstanceId: "0x654321"
          }
        }, 100);
        this.sendCallback({
          type: "installEvent",
          data: {
            appInstance: this.generateAppInstanceDetail({
              intermediaries: message.params.intermediaries
            })
          }
        }, 500);
        break;
      }
      case "installVirtual": {
        const appInstance = this.generateAppInstanceDetail({
          intermediaries: message.params.intermediaries
        });
        this.sendCallback(Object.assign({
          type: "installVirtual",
          requestId: message.requestId,
          result: {
            appInstance
          }
        }), 100); // method
        this.sendCallback({
          type: "installEvent",
          data: {
            appInstance
          }
        }, 500); // event
        break;
      }
      case "getAppInstanceDetails": {
        this.sendCallback({
          type: "getAppInstanceDetails",
          requestId: message.requestId,
          result: {
            appInstance: this.generateAppInstanceDetail()
          }
        }, 1000);
        break;
      }
      default: throw new Error(`Unknown action type: ${message.type}`);
    }
  }

  generateAppInstanceDetail(params = {}) {
    return Object.assign({
      id: "0x60504030201",
      appId: "0x123123456456",
      abiEncodings: {
        actionEncoding: "tuple(ActionType actionType, uint256 playX, uint256 playY, WinClaim winClaim)",
        stateEncoding: "tuple(address[2] players, uint256 turnName, uint256 winner, uint256[3][3] board)"
      },
      asset: {
        assetType: 0
      },
      myDeposit: window.ethers.utils.parseEther("0.1"),
      peerDeposit: window.ethers.utils.parseEther("0.1"),
      timeout: window.ethers.utils.bigNumberify("100"),
      intermediaries: ["0x2515151515151515151515151515151515151515"]
    }, params);
  }

  sendCallback(message, timeout) {
    console.log("message out", message);
    setTimeout(() => {
      this.callback(message);
    }, timeout);
  }

  async connect() {
    if (this.isConnected) {
      console.warn("NodeProvider is already connected.");
      return Promise.resolve(this);
    }

    return new Promise((resolve, reject) => {
      return setTimeout(() => {
        this.isConnected = true;
        return resolve(this);
      }, 100);
    });
  }
}