import {
  FirebaseServiceFactory,
  MNEMONIC_PATH,
  Node
} from "@counterfactual/node";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

import { afterUser } from "./bot";
import {
  buildRegistrationSignaturePayload,
  createAccount,
  deposit,
  fetchMultisig
} from "./utils";

const provider = ethers.getDefaultProvider("ropsten");

let BASE_URL = `https://server.playground-staging.counterfactual.com`;

console.log("Creating serviceFactory");
let serviceFactory: FirebaseServiceFactory;
if (process.env.TIER && process.env.TIER === "development") {
  BASE_URL = `http://localhost:9000`;

  const firebaseServerHost = process.env.FIREBASE_SERVER_HOST;
  const firebaseServerPort = process.env.FIREBASE_SERVER_PORT;
  serviceFactory = new FirebaseServiceFactory({
    apiKey: "",
    authDomain: "",
    databaseURL: `ws://${firebaseServerHost}:${firebaseServerPort}`,
    projectId: "",
    storageBucket: "",
    messagingSenderId: ""
  });
} else {
  serviceFactory = new FirebaseServiceFactory({
    apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
    authDomain: "foobar-91a31.firebaseapp.com",
    databaseURL: "https://foobar-91a31.firebaseio.com",
    projectId: "foobar-91a31",
    storageBucket: "foobar-91a31.appspot.com",
    messagingSenderId: "432199632441"
  });
}

// const STATE_ENCODING = `
//       tuple(
//         address[2] playerAddrs,
//         uint8 stage,
//         bytes32 salt,
//         bytes32 commitHash,
//         uint256 playerFirstNumber,
//         uint256 playerSecondNumber
//       )
//     `;
// const ACTION_ENCODING = `
//     tuple(
//         uint8 actionType,
//         uint256 number,
//         bytes32 actionHash,
//       )
//     `;

const settingsPath = path.resolve(__dirname, "settings.json");
let node: Node;

async function bootstrap() {
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

  console.log("Creating store");
  const store = serviceFactory.createStoreService("highRollerBotStore1");

  if (!(await store.get(MNEMONIC_PATH)) && settings[MNEMONIC_PATH]) {
    await store.set([{ key: MNEMONIC_PATH, value: settings[MNEMONIC_PATH] }]);
  }

  console.log("Creating Node");
  const messService = serviceFactory.createMessagingService("messaging");
  node = await Node.create(
    messService,
    store,
    {
      STORE_KEY_PREFIX: "store"
    },
    ethers.getDefaultProvider("ropsten"),
    "ropsten"
  );

  console.log("public identifier", node.publicIdentifier);
  if (settings["token"]) {
    await afterUser(node);
  } else {
    try {
      const user = {
        email: "HighRollerBot",
        ethAddress: "0xdab32c06dab94feae04ebd7a54128bc22115eb51",
        nodeAddress: node.publicIdentifier,
        username: "HighRollerBot"
      };
      const privateKey = settings["privateKey"];
      if (!privateKey) {
        throw Error('No private key specified in "settings.json". Exiting.');
      }
      const wallet = new ethers.Wallet(privateKey, provider);
      const signature = await wallet.signMessage(
        buildRegistrationSignaturePayload(user)
      );

      const createdAccount = await createAccount(BASE_URL, user, signature);
      settings["token"] = createdAccount.token;
      console.log("Account created. Fetching multisig address");
      const multisigAddress = await fetchMultisig(createdAccount.token!);

      console.log(`Account created with token: ${createdAccount.token}`);

      let depositAmount = process.argv[2];
      if (!depositAmount) {
        depositAmount = "0.01";
      }
      await deposit(node, depositAmount, multisigAddress);

      // save token to settings after user & channel are  successfully created and funded
      fs.writeFileSync(settingsPath, JSON.stringify(settings));

      await afterUser(node);
    } catch (e) {
      console.error("\n");
      console.error(e);
      console.error("\n");
      process.exit(1);
    }
  }
}

bootstrap();
