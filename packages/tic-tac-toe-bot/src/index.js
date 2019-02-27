const fs = require("fs");
const path = require("path");
const { FirebaseServiceFactory, Node } = require("@counterfactual/node");
const { ethers } = require("ethers");
const fetch = require("node-fetch");
const provider = ethers.getDefaultProvider("ropsten");
const Web3 = require("web3");
const web3 = new Web3(provider);
const { connectNode } = "./node";

const BASE_URL = process.env.BASE_URL;

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

    pairs.forEach((pair) => {
      store[pair.key] = pair.value;
    });

    fs.writeFileSync(storePath, JSON.stringify(store));

    return true;
  }
}

(async () => {
  const serviceFactory = new FirebaseServiceFactory({
    apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
    authDomain: "foobar-91a31.firebaseapp.com",
    databaseURL: "https://foobar-91a31.firebaseio.com",
    projectId: "foobar-91a31",
    storageBucket: "foobar-91a31.appspot.com",
    messagingSenderId: "432199632441"
  });

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
    await connectNode(node, process.env.ETH_ADDRESS);
  } else {
    const user = {
      email: "TicTacToeBot",
      ethAddress: process.env.ETH_ADDRESS,
      nodeAddress: node.publicIdentifier,
      username: "TicTacToeBot"
    };
        
    const privateKey = process.env.PRIVATE_KEY;
    const messageObj = web3.eth.accounts.sign(
      web3.utils.toHex(buildRegistrationSignaturePayload(user)),
      privateKey
    );
    const createdAccount = await createAccount(user, messageObj.signature);

    await store.set([{
      key: "botAccount",
      value: createdAccount
    }]);

    await connectNode(node, process.env.ETH_ADDRESS);
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