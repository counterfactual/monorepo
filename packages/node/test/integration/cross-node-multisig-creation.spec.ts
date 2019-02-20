import { BaseProvider, JsonRpcProvider } from "ethers/providers";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { MNEMONIC_PATH } from "../../src/signer";

import TestFirebaseServiceFactory from "./services/firebase-service";
import { getChannelAddresses, getNewMultisig, TEST_NETWORK } from "./utils";

describe("Node can create multisig, other owners get notified", () => {
  jest.setTimeout(20000);
  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeConfig: NodeConfig;
  let provider: BaseProvider;

  beforeAll(async () => {
    firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };

    // @ts-ignore
    provider = new JsonRpcProvider(global.ganacheURL);

    storeServiceA = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    storeServiceA.set([{ key: MNEMONIC_PATH, value: process.env.A_MNEMONIC }]);
    nodeA = await Node.create(
      messagingService,
      storeServiceA,
      nodeConfig,
      provider,
      TEST_NETWORK,
      // @ts-ignore
      global.networkContext
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      nodeConfig,
      provider,
      TEST_NETWORK,
      // @ts-ignore
      global.networkContext
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  describe("Queued channel creation", () => {
    it("Node A can create multiple back-to-back channels with Node B", async () => {
      expect.assertions(5);

      let multisigAddress1: string;
      let multisigAddress2: string;
      const multisigAddress1Promise = getNewMultisig(nodeA, [
        nodeA.publicIdentifier,
        nodeB.publicIdentifier
      ]);
      const multisigAddress2Promise = getNewMultisig(nodeA, [
        nodeA.publicIdentifier,
        nodeB.publicIdentifier
      ]);

      // multisigAddress2Promise should have been blocked on
      // multisigAddress1Promise finishing
      multisigAddress1Promise.then(address => {
        expect(multisigAddress2).toBeUndefined();
      });

      multisigAddress2 = await multisigAddress2Promise;
      // multisigAddress1Promise has already resolved by this point, simply
      // getting its value
      multisigAddress1 = await multisigAddress1Promise;

      const openChannelsNodeA = await getChannelAddresses(nodeA);
      const openChannelsNodeB = await getChannelAddresses(nodeB);
      expect(openChannelsNodeA[0]).toEqual(multisigAddress1);
      expect(openChannelsNodeB[0]).toEqual(multisigAddress1);
      expect(openChannelsNodeA[1]).toEqual(multisigAddress2);
      expect(openChannelsNodeB[1]).toEqual(multisigAddress2);
    });
  });
});
