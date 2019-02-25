const fs = require("fs");
const path = require("path");
const { FirebaseServiceFactory, Node } = require("@counterfactual/node");
const { ethers } = require("ethers");
const { v4 } = require("uuid");
const bn = ethers.utils.bigNumberify;
const ZERO = bn(0);
const fetch = require("node-fetch");
const provider = ethers.getDefaultProvider("ropsten");
const Web3 = require("web3");
const web3 = new Web3(provider);

const BASE_URL = process.env.BASE_URL;

console.log("environment", process.env.TIER)

function checkDraw(board) {
  return board.every(row => row.every(square => !bn(square).eq(ZERO)));
}

function checkVictory(board, player) {
  return (
    checkHorizontalVictory(board, player) ||
    checkVerticalVictory(board, player) ||
    checkDiagonalVictory(board, player) ||
    checkCrossDiagonalVictory(board, player)
  );
}

function checkHorizontalVictory(board, player) {
  let idx;
  const victory = board.some((row, index) => {
    idx = index;
    return row.every(square => bn(square).eq(bn(player)));
  });

  if (victory) {
    return {
      winClaimType: 0,
      idx
    };
  }
}

function checkVerticalVictory(board, player) {
  let idx;
  const victory = board[0].some((columnStart, index) => {
    idx = index;
    return (
      bn(columnStart).eq(bn(player)) &&
      bn(board[1][index]).eq(bn(player)) &&
      bn(board[2][index]).eq(bn(player))
    );
  });

  if (victory) {
    return {
      winClaimType: 1,
      idx
    };
  }
}

function checkDiagonalVictory(board, player) {
  const victory =
    bn(board[0][0]).eq(bn(player)) &&
    bn(board[1][1]).eq(bn(player)) &&
    bn(board[2][2]).eq(bn(player));

  if (victory) {
    return {
      winClaimType: 2,
      idx: 0
    };
  }
}

function checkCrossDiagonalVictory(board, player) {
  const victory =
    bn(board[0][2]).eq(bn(player)) &&
    bn(board[1][1]).eq(bn(player)) &&
    bn(board[2][0]).eq(bn(player));

  if (victory) {
    return {
      winClaimType: 3,
      idx: 0
    };
  }
}

 class NodeProvider {
  constructor(node) {
    this.node = node;
  }

   onMessage(callback) {
    this.node.on("message", callback);
  }

   sendMessage(message) {
    this.node.emit(message.type, message);
  }

   async connect() {
    return Promise.resolve(this);
  }
}

const storePath = path.resolve(__dirname, 'store.json');

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

    pairs.forEach((pair) => {
      store[pair.key] = pair.value;
    });

    fs.writeFileSync(storePath, JSON.stringify(store));

    return true
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
  const store = process.env.TIER === "production" ? serviceFactory.createStoreService("tttStore") : new JsonFileStoreService();
  const messServce = serviceFactory.createMessagingService("messaging");
  const node = await Node.create(
    messServce,
    store,
    {
      STORE_KEY_PREFIX: "store"
    },
    provider,
    "ropsten",
    // {
    //   AppRegistry: "0x6296F3ACf03b6D787BD1068B4DB8093c54d5d915",
    //   ETHBalanceRefund: "0x6a2DF880908eC363Bc386917353e5b2693B97096",
    //   ETHBucket: "0x5C505AA5498607224FbE95263c13BD686223aBe9",
    //   MultiSend: "0x3E7e57fd79F4d43607667538879C513577974bD6",
    //   NonceRegistry: "0x5ecb2be3E5b0e4836C4fDb18fDd381861dF0D537",
    //   StateChannelTransaction: "0x9F8fc6D23DC4882284C44bcf6fb7F96290705d3D",
    //   ETHVirtualAppAgreement: "0xdb2Ed0d73d0E6b8f431c999EC97D1AcFf5A0Ee2E"
    // }
  );

  if (await store.get("botAccount")) {
    await connectNode(node);
  } else {
    try {
      const user = {
        email: "TicTacToeBot",
        ethAddress: process.env.ETH_ADDRESS,
        nodeAddress: node.publicIdentifier,
        username: "TicTacToeBot"
      };
      console.log(`User to create: ${JSON.stringify(user)}`);
      const privateKey = process.env.PRIVATE_KEY;
      const messageObj = web3.eth.accounts.sign(
        web3.utils.toHex(buildRegistrationSignaturePayload(user)),
        privateKey
      );
      const createdAccount = await createAccount(user, messageObj.signature);

      await store.set([{
        key: "botAccount",
        value: createdAccount
      }])

      await connectNode(node);
    } catch (e) {
      console.log("Error: ", e);
    }
  }
})();

async function createAccount(user, signature) {
  try {
    const data = toAPIResource(user);
    const json = await post("users", data, signature);
    const resource = json.data;

    return fromAPIResource(resource);
  } catch (e) {
    return Promise.reject(e);
  }
}

function buildRegistrationSignaturePayload(data) {
  return [
    "PLAYGROUND ACCOUNT REGISTRATION",
    `Username: ${data.username}`,
    `E-mail: ${data.email}`,
    `Ethereum address: ${data.ethAddress}`,
    `Node address: ${data.nodeAddress}`
  ].join("\n");
}

async function post(endpoint, data, token, authType = "Signature") {
  const body = JSON.stringify({
    data
  });
  
  const httpResponse = await fetch(`${BASE_URL}/api/${endpoint}`, {
    body,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(token ? { Authorization: `${authType} ${token}` } : {})
    },
    method: "POST"
  });

  const response = await httpResponse.json();

  if (response.errors) {
    const error = response.errors[0];
    throw error;
  }

  return response;
}

function fromAPIResource(resource) {
  return {
    id: resource.id,
    ...resource.attributes
  };
}

function toAPIResource(model) {
  return {
    ...(model["id"] ? { id: model["id"] } : {}),
    attributes: {
      ...Object.keys(model)
        .map(key => {
          return { [key]: model[key] };
        })
        .reduce((previous, current) => {
          return { ...previous, ...current };
        }, {})
    }
  };
}

function respond(node, { data: { appInstanceId, newState } }) {
  const winner = ethers.utils.bigNumberify(newState[2]).toNumber();

  if (winner === 0) {
    const action = takeTurn(newState, process.env.ETH_ADDRESS);
    const request = {
      params: {
        appInstanceId,
        action
      },
      requestId: v4(),
      type: "takeAction"
    };

    node.call(
      request.type,
      request
    )
  }
}

function takeTurn(newState, ethAddress) {
  const [players, turnNum, winner, board] = newState;
  const botPlayerNumber = players.indexOf(ethAddress) + 1;
  const { playX, playY } = makeMove(board, botPlayerNumber);
  board[playX][playY] = ethers.utils.bigNumberify(botPlayerNumber);
  const winClaim = checkVictory(board, botPlayerNumber);

  return {
    actionType: determineActionType(board, botPlayerNumber),
    winClaim: winClaim || { winClaimType: 0, idx: 0 },
    playX,
    playY
  }
}

function makeMove(board) {
  const possibleMoves = [];

  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      if (ethers.utils.bigNumberify(board[x][y]).toNumber() === 0) {
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

  return {
    playX,
    playY
  }
}

function determineActionType(board, botPlayerNumber) {
  if (checkVictory(board, botPlayerNumber)) {
    return 1;
  } else if (checkDraw(board)) {
    return 2;
  } else {
    return 0;
  }
}

async function connectNode(node) {
  console.log("Creating NodeProvider");
  const nodeProvider = new NodeProvider(node);
  await nodeProvider.connect();

  console.log("Create event listener for proposeInstallVirtual");
  node.on("proposeInstallVirtualEvent", async (data) => {
    const appInstanceId = data.data.appInstanceId;
    const intermediaries = data.data.params.intermediaries;

    const request = {
      type: "installVirtual",
      params: {
        appInstanceId,
        intermediaries
      },
      requestId: v4()
    };

    console.log("request", request)

    const appInstance = (await node.call(
      request.type,
      request
    )).result;

    console.log("appInstance", appInstance)

    node.on("updateStateEvent", async (updateEventData) => {
      if (updateEventData.data.appInstanceId === appInstanceId) {
        respond(node, updateEventData);
      }
    });
  });
};

module.exports.takeTurn = takeTurn;
module.exports.connectNode = connectNode;