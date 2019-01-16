import FirebaseServer from "firebase-server";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";

import TestFirebaseServiceFactory from "./services/firebase-service";
import { EMPTY_NETWORK, getChannelAddresses, getNewMultisig } from "./utils";

describe("Node can create multisig, other owners get notified", () => {
  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let firebaseServer: FirebaseServer;
  let messagingService: IMessagingService;
  let nodeA;
  let storeServiceA: IStoreService;
  let nodeB;
  let storeServiceB: IStoreService;
  let nodeConfig: NodeConfig;

  beforeAll(() => {
    firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };
  });

  beforeEach(async () => {
    // Setting up a different store service to simulate different store services
    // being used for each Node
    storeServiceA = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeA = await Node.create(
      messagingService,
      storeServiceA,
      EMPTY_NETWORK,
      nodeConfig
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      EMPTY_NETWORK,
      nodeConfig
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("Node A can create multisig and sync with Node B on new multisig creation", async () => {
    const multisigAddress = await getNewMultisig(nodeA, [
      nodeA.address,
      nodeB.address
    ]);
    const openChannelsNodeA = await getChannelAddresses(nodeA);
    const openChannelsNodeB = await getChannelAddresses(nodeB);
    expect(openChannelsNodeA[0]).toEqual(multisigAddress);
    expect(openChannelsNodeB[0]).toEqual(multisigAddress);
  });
});
