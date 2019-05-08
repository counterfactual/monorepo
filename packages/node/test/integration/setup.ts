import { JsonRpcProvider } from "ethers/providers";
import { v4 as generateUUID } from "uuid";

import { MNEMONIC_PATH, Node } from "../../src";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";
import { A_MNEMONIC } from "../test-constants.jest";

export async function setup(global: any) {
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

  const storeServiceA = firebaseServiceFactory.createStoreService(
    process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
  );

  storeServiceA.set([{ key: MNEMONIC_PATH, value: A_MNEMONIC }]);
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
  const nodeB = await Node.create(
    messagingService,
    storeServiceB,
    nodeConfig,
    provider,
    global["networkContext"]
  );

  return { nodeA, nodeB, firebaseServiceFactory };
}
