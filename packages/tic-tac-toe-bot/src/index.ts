import {
  FirebaseServiceFactory,
  MNEMONIC_PATH,
  Node
} from "@counterfactual/node";
import { ethers } from "ethers";

import {
  afterUser,
  buildRegistrationSignaturePayload,
  createAccount,
  deposit,
  fetchMultisig,
  getUser,
  UserSession
} from "./utils";

const provider = ethers.getDefaultProvider("ropsten");

const BASE_URL = process.env.BASE_URL!;
const TOKEN_PATH = "TTT_USER_TOKEN";

console.log("Creating serviceFactory");
let serviceFactory: FirebaseServiceFactory;
if (process.env.TIER && process.env.TIER === "development") {
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

let node: Node;

(async () => {
  console.log("Creating store");
  const store = serviceFactory.createStoreService("tttBotStore1");

  await store.set([{ key: MNEMONIC_PATH, value: process.env.NODE_MNEMONIC }]);

  console.log("Creating Node");
  const messService = serviceFactory.createMessagingService("messaging");
  node = await Node.create(
    messService,
    store,
    {
      STORE_KEY_PREFIX: "store"
    },
    ethers.getDefaultProvider("kovan"),
    "kovan"
  );

  console.log("public identifier", node.publicIdentifier);

  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw Error("No private key specified in env. Exiting.");
    }
    const wallet = new ethers.Wallet(privateKey, provider);
    const user = {
      email: "TicTacToeBot",
      ethAddress: wallet.address,
      nodeAddress: node.publicIdentifier,
      username: "TicTacToeBot"
    };
    const signature = await wallet.signMessage(
      buildRegistrationSignaturePayload(user)
    );

    let bot: UserSession;
    let token = await store.get(TOKEN_PATH);
    if (token) {
      bot = await getUser(BASE_URL, token);
    } else {
      bot = await createAccount(BASE_URL, user, signature);
      token = bot.token;
      await store.set([
        {
          key: TOKEN_PATH,
          value: token!
        }
      ]);
      console.log(`Account created\n`, bot);
    }

    const multisigAddress = await fetchMultisig(BASE_URL, token!);
    console.log("Account multisig address:", multisigAddress);

    let depositAmount = process.argv[2];
    if (!depositAmount) {
      depositAmount = "0.005";
    }
    await deposit(node, depositAmount, multisigAddress);

    afterUser(node, bot.nodeAddress, multisigAddress);
  } catch (e) {
    console.error("\n");
    console.error(e);
    console.error("\n");
    process.exit(1);
  }
})();
