"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("@counterfactual/node");
const ethers_1 = require("ethers");
const providers_1 = require("ethers/providers");
const hdnode_1 = require("ethers/utils/hdnode");
const utils_1 = require("./utils");
const provider = new providers_1.JsonRpcProvider("https://kovan.infura.io/metamask");
const BASE_URL = process.env.BASE_URL;
const TOKEN_PATH = "HR_USER_TOKEN";
let serviceFactory;
console.log(`Using Firebase configuration for ${process.env.NODE_ENV}`);
if (!node_1.devAndTestingEnvironments.has(process.env.NODE_ENV)) {
    node_1.confirmFirebaseConfigurationEnvVars();
    serviceFactory = new node_1.FirebaseServiceFactory({
        apiKey: process.env[node_1.FIREBASE_CONFIGURATION_ENV_KEYS.apiKey],
        authDomain: process.env[node_1.FIREBASE_CONFIGURATION_ENV_KEYS.authDomain],
        databaseURL: process.env[node_1.FIREBASE_CONFIGURATION_ENV_KEYS.databaseURL],
        projectId: process.env[node_1.FIREBASE_CONFIGURATION_ENV_KEYS.projectId],
        storageBucket: process.env[node_1.FIREBASE_CONFIGURATION_ENV_KEYS.storageBucket],
        messagingSenderId: process.env[node_1.FIREBASE_CONFIGURATION_ENV_KEYS.messagingSenderId]
    });
}
else {
    node_1.confirmLocalFirebaseConfigurationEnvVars();
    const firebaseServerHost = process.env.FIREBASE_SERVER_HOST;
    const firebaseServerPort = process.env.FIREBASE_SERVER_PORT;
    serviceFactory = new node_1.FirebaseServiceFactory({
        apiKey: "",
        authDomain: "",
        databaseURL: `ws://${firebaseServerHost}:${firebaseServerPort}`,
        projectId: "",
        storageBucket: "",
        messagingSenderId: ""
    });
}
let node;
(async () => {
    if (!node_1.devAndTestingEnvironments.has(process.env.NODE_ENV)) {
        await serviceFactory.auth(process.env[node_1.FIREBASE_CONFIGURATION_ENV_KEYS.authEmail], process.env[node_1.FIREBASE_CONFIGURATION_ENV_KEYS.authPassword]);
    }
    const store = serviceFactory.createStoreService("hrBotStore1");
    await store.set([{ key: node_1.MNEMONIC_PATH, value: process.env.NODE_MNEMONIC }]);
    const messService = serviceFactory.createMessagingService("messaging");
    node = await node_1.Node.create(messService, store, {
        STORE_KEY_PREFIX: "store"
    }, provider, "kovan");
    console.log(`Node Public Identifier: ${node.publicIdentifier}`);
    console.log(`0th derived key: ${hdnode_1.fromExtendedKey(node.publicIdentifier).derivePath("0").address}`);
    try {
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw Error("No private key specified in env. Exiting.");
        }
        const wallet = new ethers_1.Wallet(privateKey, provider);
        const user = {
            email: "HighRollerBot",
            ethAddress: wallet.address,
            nodeAddress: node.publicIdentifier,
            username: "HighRollerBot"
        };
        const signature = await wallet.signMessage(utils_1.buildRegistrationSignaturePayload(user));
        let bot;
        let token = await store.get(TOKEN_PATH);
        if (token) {
            console.log(`Getting pre-existing user ${user.username} account: ${token}`);
            bot = await utils_1.getUser(BASE_URL, token);
        }
        else {
            bot = await utils_1.createAccount(BASE_URL, user, signature);
            token = bot.token;
            await store.set([
                {
                    key: TOKEN_PATH,
                    value: token
                }
            ]);
            console.log(`Account created\n`, bot);
        }
        const multisigAddress = await utils_1.fetchMultisig(BASE_URL, token);
        console.log("Account multisig address:", multisigAddress);
        if (process.env.DEPOSIT_AMOUNT) {
            await utils_1.deposit(node, process.env.DEPOSIT_AMOUNT, multisigAddress);
        }
        utils_1.afterUser(user.username, node, bot.nodeAddress, multisigAddress);
    }
    catch (e) {
        console.error("\n");
        console.error(e);
        console.error("\n");
        process.exit(1);
    }
})();
//# sourceMappingURL=index.js.map