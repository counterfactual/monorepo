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
import { LocalFirebaseServiceFactory } from "../services/firebase-server";
import { A_MNEMONIC, B_MNEMONIC } from "../test-constants.jest";

export async function setup(
  global: any,
  nodeCPresent: boolean = false,
  newMnemonics: boolean = false
) {
  const firebaseServiceFactory = new LocalFirebaseServiceFactory(
    process.env.FIREBASE_DEV_SERVER_HOST!,
    process.env.FIREBASE_DEV_SERVER_PORT!
  );
  const messagingService = firebaseServiceFactory.createMessagingService(
    process.env.FIREBASE_MESSAGING_SERVER_KEY!
  );
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

  const storeServiceA = firebaseServiceFactory.createStoreService(
    process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
  );

  storeServiceA.set([{ key: MNEMONIC_PATH, value: mnemonicA }]);
  const nodeA = await Node.create(
    messagingService,
    storeServiceA,
    nodeConfig,
    provider,
    global["networkContext"]
  );

  const storeServiceB = firebaseServiceFactory.createStoreService(
    process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
  );
  storeServiceB.set([{ key: MNEMONIC_PATH, value: mnemonicB }]);
  const nodeB = await Node.create(
    messagingService,
    storeServiceB,
    nodeConfig,
    provider,
    global["networkContext"]
  );

  let nodeC: Node;
  if (nodeCPresent) {
    const storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeC = await Node.create(
      messagingService,
      storeServiceB,
      nodeConfig,
      provider,
      global["networkContext"]
    );

    return { nodeA, nodeB, nodeC, firebaseServiceFactory };
  }

  return { nodeA, nodeB, firebaseServiceFactory };
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
