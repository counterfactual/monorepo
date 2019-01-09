import dotenv from "dotenv-extended";
import FirebaseServer from "firebase-server";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";

import TestFirebaseServiceFactory from "./services/firebase-service";
import { EMPTY_NETWORK, getChannelAddresses, getNewMultisig } from "./utils";

dotenv.load();

describe("Node can create multisig, other owners get notified", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let nodeB: Node;
  let nodeConfig: NodeConfig;

  beforeAll(() => {
    const firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    storeService = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY!
    );
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };
  });

  beforeEach(() => {
    nodeA = new Node(
      process.env.A_PRIVATE_KEY!,
      messagingService,
      storeService,
      EMPTY_NETWORK,
      nodeConfig
    );
    nodeB = new Node(
      process.env.B_PRIVATE_KEY!,
      messagingService,
      storeService,
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
