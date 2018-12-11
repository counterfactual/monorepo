import { Node as NodeTypes } from "@counterfactual/common-types";
import dotenv from "dotenv";
import FirebaseServer from "firebase-server";

import {
  IMessagingService,
  IStoreService,
  Node,
  NodeConfig,
  NodeMessage
} from "../../src";

import { A_PRIVATE_KEY, B_PRIVATE_KEY } from "../env";

import FirebaseServiceFactory from "./services/firebase-service";
import { makeMultisigRequest } from "./utils";

dotenv.config();

describe("Node can create multisig, other owners get notified", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let nodeB: Node;
  let nodeConfig: NodeConfig;

  beforeAll(() => {
    const firebaseServiceFactory = new FirebaseServiceFactory(
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
      MULTISIG_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };
  });

  beforeEach(() => {
    nodeA = new Node(A_PRIVATE_KEY, messagingService, storeService, nodeConfig);
    nodeB = new Node(B_PRIVATE_KEY, messagingService, storeService, nodeConfig);
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("Node A can create multisig and sync with Node B on new multisig creation", async done => {
    // Node A creates the multisig for both A and B
    // B receives notification of new multisig
    const multisigCreationRequest = makeMultisigRequest([
      nodeA.address,
      nodeB.address
    ]);
    nodeB.on(NodeTypes.EventName.MULTISIG_CREATED, async (msg: NodeMessage) => {
      const channels = await nodeB.channels.getAllChannels();
      expect(Object.keys(channels)[0]).toEqual(msg.data.multisigAddress);
      done();
    });

    nodeA.emit(multisigCreationRequest.type, multisigCreationRequest);
  });
});
