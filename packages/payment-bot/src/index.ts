import {
  confirmFirebaseConfigurationEnvVars,
  confirmLocalFirebaseConfigurationEnvVars,
  // confirmPostgresConfigurationEnvVars,
  devAndTestingEnvironments,
  FIREBASE_CONFIGURATION_ENV_KEYS,
  FirebaseServiceFactory,
  MNEMONIC_PATH,
  Node
  // POSTGRES_CONFIGURATION_ENV_KEYS
} from "@counterfactual/node";
import { ethers } from "ethers";

import { showMainPrompt } from "./bot";
import {
  afterUser,
  buildRegistrationSignaturePayload,
  createAccount,
  deposit,
  fetchMultisig,
  getFreeBalance,
  getUser,
  logEthFreeBalance,
  UserSession
} from "./utils";

const BASE_URL = process.env.BASE_URL!;
const TOKEN_PATH = process.env.USER_TOKEN || "TTT_USER_TOKEN";

const provider = new ethers.providers.JsonRpcProvider(
  "https://kovan.infura.io/metamask"
);

// let pgServiceFactory: PostgresServiceFactory;
let fbServiceFactory: FirebaseServiceFactory;
console.log(`Using Firebase configuration for ${process.env.NODE_ENV}`);

process.on("warning", e => console.warn(e.stack));

if (!devAndTestingEnvironments.has(process.env.NODE_ENV!)) {
  confirmFirebaseConfigurationEnvVars();
  fbServiceFactory = new FirebaseServiceFactory({
    apiKey: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.apiKey]!,
    authDomain: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.authDomain]!,
    databaseURL: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.databaseURL]!,
    projectId: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.projectId]!,
    storageBucket: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.storageBucket]!,
    messagingSenderId: process.env[
      FIREBASE_CONFIGURATION_ENV_KEYS.messagingSenderId
    ]!
  });
} else {
  confirmLocalFirebaseConfigurationEnvVars();
  const firebaseServerHost = process.env.FIREBASE_SERVER_HOST;
  const firebaseServerPort = process.env.FIREBASE_SERVER_PORT;
  fbServiceFactory = new FirebaseServiceFactory({
    apiKey: "",
    authDomain: "",
    databaseURL: `ws://${firebaseServerHost}:${firebaseServerPort}`,
    projectId: "",
    storageBucket: "",
    messagingSenderId: ""
  });
}
// TODO: fix this when postgres package is released
// confirmPostgresConfigurationEnvVars();
// pgServiceFactory = new PostgresServiceFactory({
//   type: "postgres",
//   database: process.env[POSTGRES_CONFIGURATION_ENV_KEYS.database]!,
//   host: process.env[POSTGRES_CONFIGURATION_ENV_KEYS.host]!,
//   password: process.env[POSTGRES_CONFIGURATION_ENV_KEYS.password]!,
//   port: parseInt(process.env[POSTGRES_CONFIGURATION_ENV_KEYS.port]!, 10),
//   username: process.env[POSTGRES_CONFIGURATION_ENV_KEYS.username]!
// });

let node: Node;

let multisigAddress: string;
let walletAddress: string;
let bot: UserSession;

export function getMultisigAddress() {
  return multisigAddress;
}

export function getWalletAddress() {
  return walletAddress;
}

export function getBot() {
  return bot;
}

(async () => {
  // await pgServiceFactory.connectDb();

  console.log("Creating store");
  // const store = pgServiceFactory.createStoreService("tttBotStore1");
  const store = fbServiceFactory.createStoreService("paymentBotStore1");

  console.log("process.env.NODE_MNEMONIC: ", process.env.NODE_MNEMONIC);
  await store.set([{ key: MNEMONIC_PATH, value: process.env.NODE_MNEMONIC }]);

  console.log("Creating Node");
  const messService = fbServiceFactory.createMessagingService("messaging");
  node = await Node.create(
    messService,
    store,
    {
      STORE_KEY_PREFIX: "store"
    },
    provider,
    "kovan"
  );

  console.log("Public Identifier", node.publicIdentifier);

  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw Error("No private key specified in env. Exiting.");
    }
    const wallet = new ethers.Wallet(privateKey, provider);
    walletAddress = wallet.address;
    const user = {
      email: "PaymentBot",
      ethAddress: wallet.address,
      nodeAddress: node.publicIdentifier,
      username: process.env.USERNAME || "PaymentBot"
    };

    let token = await store.get(TOKEN_PATH);
    if (token) {
      console.log(
        `Getting pre-existing user ${user.username} account: ${token}`
      );
      bot = await getUser(BASE_URL, token);
      console.log(`Existing account found\n`, bot);
    } else {
      const signature = await wallet.signMessage(
        buildRegistrationSignaturePayload(user)
      );
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

    multisigAddress = await fetchMultisig(BASE_URL, token!);
    console.log("Account multisig address:", multisigAddress);

    if (process.env.DEPOSIT_AMOUNT) {
      await deposit(node, process.env.DEPOSIT_AMOUNT, multisigAddress);
    }

    afterUser(user.username, node, bot.nodeAddress, multisigAddress);
    logEthFreeBalance(await getFreeBalance(node, multisigAddress));
    showMainPrompt(node);
  } catch (e) {
    console.error("\n");
    console.error(e);
    console.error("\n");
    process.exit(1);
  }
})();
