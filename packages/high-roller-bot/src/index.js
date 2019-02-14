const cf = require("@counterfactual/cf.js");
const fs = require("fs");
const path = require("path");
const { FirebaseServiceFactory, Node } = require("@counterfactual/node");
const { ethers } = require("ethers");
const { HashZero } = require("ethers/constants");
const { v4 } = require("uuid");

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

const storePath = path.resolve(__dirname, "store.json");

class JsonFileStoreService {
  async get(desiredKey) {
    const data = JSON.parse(fs.readFileSync(storePath));
    const entries = {};
    const allKeys = Object.keys(data);
    for (const key of allKeys) {
      if (key.includes(desiredKey)) {
        entries[key] = data[key];
      }
    }
    if (Object.keys(entries).length === 1) {
      return entries[desiredKey];
    }
    for (const key of Object.keys(entries)) {
      const leafKey = key.split("/")[key.split("/").length - 1];
      const value = entries[key];
      delete entries[key];
      entries[leafKey] = value;
    }

    return Object.keys(entries).length > 0 ? entries : undefined;
  }
  async set(pairs) {
    const store = JSON.parse(fs.readFileSync(storePath));

    pairs.forEach(pair => {
      store[pair.key] = pair.value;
    });

    fs.writeFileSync(storePath, JSON.stringify(store));

    return true;
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
  const store = new JsonFileStoreService();
  console.log("Creating Node");
  const messService = serviceFactory.createMessagingService("messaging");
  const node = await Node.create(
    messService,
    store,
    {
      STORE_KEY_PREFIX: "store"
    },
    ethers.getDefaultProvider("ropsten"),
    "ropsten"
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
    if (state === "") appInstance.takeAction(randomNum);
  });

  console.log("Create event listener for installVirtual");
  cfProvider.on("installVirtual", appInstance => {
    console.log(`Received appInstance ${appInstance}`);
    appInstance.install();
  });
})();
