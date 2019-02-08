import cf from "@counterfactual/cf.js";
import { FirebaseServiceFactory, Node } from "@counterfactual/node";
// import { Node as NodeTypes } from "@counterfactual/types";
import { ethers } from "ethers";
import { AddressZero } from "ethers/constants";
import { v4 as generateUUID } from "uuid";

import { EventType } from "../../cf.js/dist/src/types";

import ServerNodeProvider from "./data/server-node-provider";

// const { INSTALL, REJECT_INSTALL } = NodeTypes.EventName;

// console.log(`Node:${Node}`);
// console.log(`ethers:${ethers}`);
// console.log(`AddressZero:${AddressZero}`);
// console.log(`INSTALL:${INSTALL}`);
// console.log(`REJECT_INSTALL:${REJECT_INSTALL}`);

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

let node;

const serviceFactory = new FirebaseServiceFactory({
  apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
  authDomain: "foobar-91a31.firebaseapp.com",
  databaseURL: "https://foobar-91a31.firebaseio.com",
  projectId: "foobar-91a31",
  storageBucket: "foobar-91a31.appspot.com",
  messagingSenderId: "432199632441"
});

const store = serviceFactory.createStoreService(generateUUID());
node = await Node.create(
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

class NodeProvider {
  onMessage(callback) {
    node.on("message", callback);
  }

  sendMessage(message) {
    node.emit("message", message);
  }

  async connect() {
    if (this.isConnected) {
      console.warn("NodeProvider is already connected.");
      return Promise.resolve(this);
    }
  }
}

const nodeProvider = new NodeProvider();
await nodeProvider.connect();

let appFactory = new cf.AppFactory(
  " 0x6296F3ACf03b6D787BD1068B4DB8093c54d5d915",
  {
    actionEncoding: ACTION_ENCODING,
    stateEncoding: STATE_ENCODING
  },
  cfProvider
);

const cfProvider = new cf.Provider(nodeProvider);
cfProvider.on("updateState", newState => {
  if (state === "") appInstance.takeAction(randomNum);
});

cfProvider.on("proposeInstall", appInstance => {
  appInstance.install();
});
