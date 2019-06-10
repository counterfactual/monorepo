// @ts-ignore - firebase-server depends on node being transpiled first, circular dependency
import { LocalFirebaseServiceFactory } from "@counterfactual/firebase-server";
import { PostgresServiceFactory } from "@counterfactual/postgresql-node-connector";
import { Node as NodeTypes } from "@counterfactual/types";
import { Wallet } from "ethers";
import {
  JsonRpcProvider,
  Provider,
  TransactionRequest
} from "ethers/providers";
import { parseEther } from "ethers/utils";
import { fromMnemonic } from "ethers/utils/hdnode";
import { v4 as generateUUID } from "uuid";

import { MNEMONIC_PATH, Node } from "../../src";
import { CF_PATH } from "../global-setup.jest";
import { MemoryMessagingService } from "../services/memory-messaging-service";
import { MemoryStoreServiceFactory } from "../services/memory-store-service";
import { A_MNEMONIC, B_MNEMONIC } from "../test-constants.jest";

export async function setupWithMemoryMessagingAndPostgresStore(
  global: any,
  nodeCPresent: boolean = false,
  newMnemonics: boolean = false
) {
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
) {
  const nodeConfig = {
    STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
  };

  const provider = new JsonRpcProvider(global["ganacheURL"]);

  let mnemonicA = A_MNEMONIC;
  let mnemonicB = B_MNEMONIC;
  if (newMnemonics) {
    // generate new mnemonics so owner addresses are different for creating
    // a channel in this suite
    const mnemonics = await generateNewFundedMnemonics(
      global["fundedPrivateKey"],
      provider
    );
    mnemonicA = mnemonics.A_MNEMONIC;
    mnemonicB = mnemonics.B_MNEMONIC;
  }

  const storeServiceA = storeServiceFactory.createStoreService!(
    `${process.env.FIREBASE_STORE_SERVER_KEY!}_${generateUUID()}`
  );

  await storeServiceA.set([{ key: MNEMONIC_PATH, value: mnemonicA }]);
  const nodeA = await Node.create(
    messagingService,
    storeServiceA,
    nodeConfig,
    provider,
    global["networkContext"]
  );

  const storeServiceB = storeServiceFactory.createStoreService!(
    `${process.env.FIREBASE_STORE_SERVER_KEY!}_${generateUUID()}`
  );
  await storeServiceB.set([{ key: MNEMONIC_PATH, value: mnemonicB }]);
  const nodeB = await Node.create(
    messagingService,
    storeServiceB,
    nodeConfig,
    provider,
    global["networkContext"]
  );

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

    return { nodeA, nodeB, nodeC };
  }

  return { nodeA, nodeB };
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
  const A_MNEMONIC = Wallet.createRandom().mnemonic;
  const B_MNEMONIC = Wallet.createRandom().mnemonic;

  const signerAPrivateKey = fromMnemonic(A_MNEMONIC).derivePath(CF_PATH)
    .privateKey;
  const signerBPrivateKey = fromMnemonic(B_MNEMONIC).derivePath(CF_PATH)
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
    A_MNEMONIC,
    B_MNEMONIC
  };
}
