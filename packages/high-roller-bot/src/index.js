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

  /*   console.log("Creating channel with server");
  const playgroundIdendifier =
    "xpub6EDEcQcke2q2q5gUnhHBf3CvdE9woerHtHDxSih49EbsHEFbTxqRXEAFGmBfQHRJT57sHLnEyY1R1jPW8pycYWLbBt5mTprj8NPBeRG1C5e";
  const stateChannelResponse = await node.call("createChannel", {
    params: {
      owners: [node.publicIdentifier, playgroundIdendifier]
    },
    type: "createChannel",
    requestId: v4()
  });
  console.log("state channel response", stateChannelResponse);

  console.log("public identifier", node.publicIdentifier); */
  // messService.onReceive(node.publicIdentifier, NodeMessage => {
  //   console.log("received", NodeMessage);
  // });
  // messService.onReceive(
  //   "xpub6EDEcQcke2q2q5gUnhHBf3CvdE9woerHtHDxSih49EbsHEFbTxqRXEAFGmBfQHRJT57sHLnEyY1R1jPW8pycYWLbBt5mTprj8NPBeRG1C5e",
  //   NodeMessage => {
  //     console.log("sent", NodeMessage);
  //   }
  // );

  /* 
Node Wallet Address: 0x058398C00D894eAD40E51277Ea06A5Dc81D6c086
Creating channel with server
state channel response { type: 'createChannel',
  requestId: 'd04c9a74-5d71-40cb-a850-e27b55579105',
  result:
   { multisigAddress: '0x52fF4fd734A5a5c4D082764C32643fE28B41653a' } }
public identifier xpub6FQSN2iXYQtARApRsztXzeL9qBPjtMpk7bkAv6Nh8EmkzN8xDzD3d8goqu7srUGiw967VES8tFjUCuKZxQMi7HW3i4XmhpBXAu9dQ1rVdkd
 */

  /*  
ethAddress: "0x058398C00D894eAD40E51277Ea06A5Dc81D6c086"
intermediary: "xpub6EDEcQcke2q2q5gUnhHBf3CvdE9woerHtHDxSih49EbsHEFbTxqRXEAFGmBfQHRJT57sHLnEyY1R1jPW8pycYWLbBt5mTprj8NPBeRG1C5e"
nodeAddress: "xpub6FQSN2iXYQtARApRsztXzeL9qBPjtMpk7bkAv6Nh8EmkzN8xDzD3d8goqu7srUGiw967VES8tFjUCuKZxQMi7HW3i4XmhpBXAu9dQ1rVdkd"
username: "HighRollerBot"
 */

  /* 
  No channel exists between the current user
  xpub6DzGNw6xEWgTz6UXLdaSjfJ3YcEp99VCX921pCTJVAK9RqUTJH6x9TwVZiMN4WcASKALGGbwDqzPs2Pm9FH8oKuq58SHbTGMa7iRJpCSArw 
  and the peer 
  xpub6EDEcQcke2q2q5gUnhHBf3CvdE9woerHtHDxSih49EbsHEFbTxqRXEAFGmBfQHRJT57sHLnEyY1R1jPW8pycYWLbBt5mTprj8NPBeRG1C5e
*/

  console.log("Creating NodeProvider");
  const nodeProvider = new NodeProvider(node);
  await nodeProvider.connect();

  console.log("Creating cfProvider");
  const cfProvider = new cf.Provider(nodeProvider);

  node.on("proposeInstallVirtualEvent", async data => {
    const appInstanceId = data.data.appInstanceId;
    const intermediaries = data.data.params.intermediaries;
    console.log(
      `Received appInstanceId ${appInstanceId} and intermediaries ${intermediaries}`
    );

    const appInstance = await cfProvider.installVirtual(
      appInstanceId,
      intermediaries
    );

    console.log("Create event listener for updateState");
    appInstance.on("updateState", ({ data }) => {
      console.log(`Received newState ${data}`);
      const newStateArray = data.newState;

      const state = {
        playerAddrs: newStateArray[0],
        stage: newStateArray[1],
        salt: newStateArray[2],
        commitHash: newStateArray[3],
        playerFirstNumber:
          this.highRollerState.playerFirstNumber || newStateArray[4],
        playerSecondNumber: newStateArray[5]
      };

      console.log(`State ${state}`);

      if (state.stage === 2) {
        // Stage.COMMITTING_NUM
        const numToCommit = Math.floor(Math.random() * Math.floor(1000));

        const commitHashAction = {
          number: numToCommit,
          actionType: 2, // ActionType.COMMIT_TO_NUM
          actionHash: HashZero
        };

        this.appInstance.takeAction(commitHashAction);
      }
    });
  });
})();
