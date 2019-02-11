const cf = require("@counterfactual/cf.js");
const { FirebaseServiceFactory, Node } = require("@counterfactual/node");
const { ethers } = require("ethers");
const { AddressZero } = require("ethers/constants");
const { v4 } = require("uuid");
const checkEndConditions = require("@counterfactual/dapp-tic-toe/utils/check-end-conditions");

 const STATE_ENCODING = `
      tuple(
        address[2] playerAddrs,
        uint8 stage,
        bytes32 salt,
        bytes32 commitHash,
        uint256 playerFirstNumber,
        uint256 playerSecondNumber
      )
    `;
const ACTION_ENCODING = `
    tuple(
        uint8 actionType,
        uint256 number,
        bytes32 actionHash,
      )
    `;

 // const BOT_USER = {
//   attributes: {
//     email: "HighRollerBot@counterfactual.com",
//     ethAddress: "0xdab32c06dab94feae04ebd7a54128bc22115eb51",
//     multisigAddress: "0x02D91A30ecCfa50cD8A72177C34E4f282A1b00d2",
//     nodeAddress:
//       "xpub6E36zmy9v3oujanBNnDnDY412eiXGuoXSTFStYmsn1TJ7sQdKrdmud6kEckat1A3y4DsLWdV33SigC15MakedwvmSCCKWNRCHkekPvQNPdb",
//     username: "HighRollerBot"
//   },
//   id: "b7605fb6-a760-4be6-b6c5-a53b54d9d4ec",
//   relationships: {},
//   type: "user"
// };

 // const APP = {
//   web3Provider: ethers.getDefaultProvider("ropsten"),
//   contracts: {}
// };

 class NodeProvider {
  constructor(node) {
    this.node = node;
  }

   onMessage(callback) {
    this.node.on("message", callback);
  }

   sendMessage(message) {
    this.node.emit("message", message);
  }

   async connect() {
    return Promise.resolve(this);
  }
}

 (async () => {
  console.log("Creating serviceFactory");
  const serviceFactory = new FirebaseServiceFactory({
    apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
    authDomain: "foobar-91a31.firebaseapp.com",
    databaseURL: "https://foobar-91a31.firebaseio.com",
    projectId: "foobar-91a31",
    storageBucket: "foobar-91a31.appspot.com",
    messagingSenderId: "432199632441"
  });

   console.log("Creating store");
  const store = serviceFactory.createStoreService(v4());
  console.log("Creating Node");
  const node = await Node.create(
    serviceFactory.createMessagingService("messaging"),
    store,
    {
      AppRegistry: AddressZero,
      ETHBalanceRefund: AddressZero,
      ETHBucket: AddressZero,
      MultiSend: AddressZero,
      NonceRegistry: AddressZero,
      StateChannelTransaction: AddressZero,
      ETHVirtualAppAgreement: AddressZero
    },
    {
      STORE_KEY_PREFIX: "store"
    },
    ethers.getDefaultProvider("ropsten")
  );

   console.log("Creating NodeProvider");
  const nodeProvider = new NodeProvider(node);
  await nodeProvider.connect();

   console.log("Creating cfProvider");
  const cfProvider = new cf.Provider(nodeProvider);

   console.log("Creating appFactory");
  const appFactory = new cf.AppFactory(
    " 0x6296F3ACf03b6D787BD1068B4DB8093c54d5d915",
    {
      actionEncoding: ACTION_ENCODING,
      stateEncoding: STATE_ENCODING
    },
    cfProvider
  );

   console.log("Create event listener for updateState");
  cfProvider.on("updateState", newState => {
    console.log(`Received newState ${newState}`);

    const possibleMoves = [];

    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        if (this.activeState.board[x][y] !== 0) {
          possibleMoves.push({
            x,
            y
          });
        }
      }
    }

    if (possibleMoves.length === 0) {
      throw new Error("Yikes! No place left to move.");
    }

    const move = possibleMoves[Math.floor(Math.random()*possibleMoves.length)];
    const playX = move.x;
    const playY = move.y;
    const myNumber = 2; // TODO: figure out how to get the actual number

    
    const boardCopy = JSON.parse(JSON.stringify(newState.board));
    boardCopy[playX][playY] = window.ethers.utils.bigNumberify(myNumber);

    const winClaim = checkEndConditions.checkVictory(boardCopy, myNumber);
    const draw = checkEndConditions.checkDraw(boardCopy);

    let actionType = 0;

    if (winClaim) {
      actionType = 1;
    } else if (draw) {
      actionType = 2;
    }

    await appInstance.takeAction({
      actionType: actionType,
      winClaim: winClaim || { winClaimType: 0, idx: 0 },
      playX,
      playY
    });
  });

   console.log("Create event listener for installVirtual");
  cfProvider.on("installVirtual", appInstance => {
    console.log(`Received appInstance ${appInstance}`);
    appInstance.install();
  });
})();