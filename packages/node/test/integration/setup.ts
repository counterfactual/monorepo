import { CF_PATH } from "@counterfactual/local-ganache-server";
import { PostgresServiceFactory } from "@counterfactual/postgresql-node-connector";
import { Node as NodeTypes } from "@counterfactual/types";
import { Wallet } from "ethers";
import {
  JsonRpcProvider,
  Provider,
  TransactionRequest
} from "ethers/providers";
import { parseEther } from "ethers/utils";
import { fromExtendedKey } from "ethers/utils/hdnode";
import { v4 as generateUUID } from "uuid";

import { EXTENDED_PRIVATE_KEY_PATH, Node } from "../../src";
import { computeRandomExtendedPrvKey } from "../../src/machine/xkeys";
import { MemoryMessagingService } from "../services/memory-messaging-service";
import { MemoryStoreServiceFactory } from "../services/memory-store-service";
import { A_EXTENDED_KEY, B_EXTENDED_KEY } from "../test-constants.jest";

export interface NodeContext {
  node: Node;
  store: NodeTypes.IStoreService;
}

export interface SetupContext {
  [nodeName: string]: NodeContext;
}

export async function setupWithMemoryMessagingAndPostgresStore(
  global: any,
  nodeCPresent: boolean = false,
  newMnemonics: boolean = false
): Promise<SetupContext> {
  const memoryMessagingService = new MemoryMessagingService();

  const postgresServiceFactory = new PostgresServiceFactory({
    type: "postgres",
    database: process.env.POSTGRES_DATABASE!,
    username: process.env.POSTGRES_USER!,
    host: process.env.POSTGRES_HOST!,
    password: process.env.POSTGRES_PASSWORD!,
    port: Number(process.env.POSTGRES_PORT!)
  });

  await postgresServiceFactory.connectDb();

  return setup(
    global,
    newMnemonics,
    nodeCPresent,
    memoryMessagingService,
    postgresServiceFactory
  );
}

export async function setup(
  global: any,
  nodeCPresent: boolean = false,
  newMnemonics: boolean = false,
  messagingService: NodeTypes.IMessagingService = new MemoryMessagingService(),
  storeServiceFactory: NodeTypes.ServiceFactory = new MemoryStoreServiceFactory()
): Promise<SetupContext> {
  const setupContext: SetupContext = {};

  const nodeConfig = {
    STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
  };

  const provider = new JsonRpcProvider(global["ganacheURL"]);

  let extendedKeyA = A_EXTENDED_KEY;
  let extendedKeyB = B_EXTENDED_KEY;
  if (newMnemonics) {
    // generate new mnemonics so owner addresses are different for creating
    // a channel in this suite
    const extendedKeys = await generateNewFundedMnemonics(
      global["fundedPrivateKey"],
      provider
    );
    extendedKeyA = extendedKeys.A_EXTENDED_KEY;
    extendedKeyB = extendedKeys.B_EXTENDED_KEY;
  }

  const storeServiceA = storeServiceFactory.createStoreService!(
    `${process.env.FIREBASE_STORE_SERVER_KEY!}_${generateUUID()}`
  );

  await storeServiceA.set([
    { key: EXTENDED_PRIVATE_KEY_PATH, value: extendedKeyA }
  ]);
  const nodeA = await Node.create(
    messagingService,
    storeServiceA,
    nodeConfig,
    provider,
    global["networkContext"]
  );

  setupContext["A"] = {
    node: nodeA,
    store: storeServiceA
  };

  const storeServiceB = storeServiceFactory.createStoreService!(
    `${process.env.FIREBASE_STORE_SERVER_KEY!}_${generateUUID()}`
  );
  await storeServiceB.set([
    { key: EXTENDED_PRIVATE_KEY_PATH, value: extendedKeyB }
  ]);
  const nodeB = await Node.create(
    messagingService,
    storeServiceB,
    nodeConfig,
    provider,
    global["networkContext"]
  );
  setupContext["B"] = {
    node: nodeB,
    store: storeServiceB
  };

  let nodeC: Node;
  if (nodeCPresent) {
    const storeServiceC = storeServiceFactory.createStoreService!(
      `${process.env.FIREBASE_STORE_SERVER_KEY!}_${generateUUID()}`
    );
    nodeC = await Node.create(
      messagingService,
      storeServiceC,
      nodeConfig,
      provider,
      global["networkContext"]
    );
    setupContext["C"] = {
      node: nodeC,
      store: storeServiceC
    };
  }

  return setupContext;
}

export async function generateNewFundedWallet(
  fundedPrivateKey: string,
  provider: Provider
) {
  const fundedWallet = new Wallet(fundedPrivateKey, provider);
  const wallet = Wallet.createRandom().connect(provider);

  const transactionToA: TransactionRequest = {
    to: wallet.address,
    value: parseEther("20").toHexString()
  };
  await fundedWallet.sendTransaction(transactionToA);
  return wallet;
}

export async function generateNewFundedMnemonics(
  fundedPrivateKey: string,
  provider: Provider
) {
  const fundedWallet = new Wallet(fundedPrivateKey, provider);
  const A_EXTENDED_KEY = computeRandomExtendedPrvKey();
  const B_EXTENDED_KEY = computeRandomExtendedPrvKey();

  const signerAPrivateKey = fromExtendedKey(A_EXTENDED_KEY).derivePath(CF_PATH)
    .privateKey;
  const signerBPrivateKey = fromExtendedKey(B_EXTENDED_KEY).derivePath(CF_PATH)
    .privateKey;

  const signerAAddress = new Wallet(signerAPrivateKey).address;
  const signerBAddress = new Wallet(signerBPrivateKey).address;

  const transactionToA: TransactionRequest = {
    to: signerAAddress,
    value: parseEther("0.1").toHexString()
  };
  const transactionToB: TransactionRequest = {
    to: signerBAddress,
    value: parseEther("0.1").toHexString()
  };
  await fundedWallet.sendTransaction(transactionToA);
  await fundedWallet.sendTransaction(transactionToB);
  return {
    A_EXTENDED_KEY,
    B_EXTENDED_KEY
  };
}
