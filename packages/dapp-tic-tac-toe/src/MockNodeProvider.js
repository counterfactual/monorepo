import { checkDraw, checkVictory } from './utils/check-end-conditions';

export default class NodeProvider {
  constructor() {
    this.isConnected = false;
    this.activeState = {
      address: ["888", "777"],
      turnNum: 0,
      winner: 0,
      board: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ]
    };
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
        this.activeState = message.params.initialState;
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
        }, 100);
        break;
      }
      case "getState": {
        this.sendCallback({
          type: "getState",
          requestId: message.requestId,
          result: {
            state: this.activeState
          }
        }, 100);
        break;
      }
      case "takeAction": {
        const { playX, playY } = message.params.action;
        const victory = message.params.action.actionType === 1;
        const tie = message.params.action.actionType === 2;

        this.setWinner(victory, tie, 2);
        this.takeAction(playX, playY, 1)
        this.sendActionEvent(message.params.appInstanceId);

        this.sendCallback({
          type: "takeAction",
          requestId: message.requestId,
          result: {
            state: this.activeState
          }
        }, 100);

        this.takeOpponentAction(message.params.appInstanceId, 750);

        break;
      }
      default: throw new Error(`Unknown action type: ${message.type}`);
    }
  }

  takeAction(x, y, playerNumber) {
    this.activeState.board[x][y] = playerNumber;
    this.activeState.turnNum += 1;
  }

  sendActionEvent(appInstanceId) {
    this.sendCallback({
      type: "updateStateEvent",
      data: {
        appInstanceId: appInstanceId,
        newState: this.activeState
      }
    }, 250);
  }

  takeOpponentAction(appInstanceId, timeout) {
    if (this.activeState.winner !== 0) return;

    setTimeout(() => {
      const { x, y } = this.determineOpponentAction();
      const boardCopy = JSON.parse(JSON.stringify(this.activeState.board));
      boardCopy[x][y] = 2;
  
      const winClaim = checkVictory(boardCopy, 2);
      const draw = checkDraw(boardCopy);

      this.setWinner(winClaim, draw, 2);
      this.takeAction(x, y, 2);
      this.sendActionEvent(appInstanceId);
    }, timeout);
  }

  setWinner(victory, tie, playerNumber) {
    if (victory) {
      this.activeState.winner = playerNumber;
    } else if (tie) {
      this.activeState.winner = 3;
    }
  }

  determineOpponentAction() {
    let x = 0;
    let y = 0;

    while(this.activeState.board[x][y] !== 0) {
      y += 1;
      if (y >= 3) {
        y = 0;
        x += 1;
      }

      if (x >= 3) {
        throw new Error("Yikes! No place left to move.");
      }
    }

    return {
      x,
      y
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