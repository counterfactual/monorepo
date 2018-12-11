import dotenv from "dotenv";
import FirebaseServer from "firebase-server";

import { IMessagingService, Node, NodeConfig } from "../../src";

import { A_PRIVATE_KEY, B_PRIVATE_KEY } from "../env";
import { MOCK_STORE_SERVICE } from "../mock-services/mock-store-service";

import FirebaseServiceFactory from "./services/firebase-service";

dotenv.config();

describe("Two nodes can communicate with each other", () => {
  let firebaseServer: FirebaseServer;
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
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      MULTISIG_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };
  });

  beforeEach(() => {
    nodeA = new Node(
      A_PRIVATE_KEY,
      messagingService,
      MOCK_STORE_SERVICE,
      nodeConfig
    );
    nodeB = new Node(
      B_PRIVATE_KEY,
      messagingService,
      MOCK_STORE_SERVICE,
      nodeConfig
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("Node A can send messages to Node B", done => {
    const installMsg = {
      event: "testEvent",
      data: {
        some: "data"
      }
    };

    nodeB.on(installMsg.event, msg => {
      expect(msg.from).toEqual(nodeA.address);
      expect(msg.event).toEqual(installMsg.event);
      expect(msg.data).toEqual(installMsg.data);
      done();
    });
    nodeA.send(nodeB.address, installMsg as any);
  });
});
