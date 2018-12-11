import { Node as NodeTypes } from "@counterfactual/common-types";
import dotenv from "dotenv";
import FirebaseServer from "firebase-server";

import { IMessagingService, Node, NodeConfig, NodeMessage } from "../../src";

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
    const installMsg: NodeMessage = {
      event: NodeTypes.EventName.INSTALL,
      data: {}
    };

    nodeB.on(NodeTypes.EventName.INSTALL, (msg: NodeMessage) => {
      expect(msg.from).toEqual(nodeA.address);
      expect(msg.event).toEqual(NodeTypes.EventName.INSTALL);
      done();
    });
    nodeA.send(nodeB.address, installMsg);
  });

  it("Node A can make proposal, Node B can reject proposal", async done => {
    const proposalMsg: NodeMessage = {
      event: NodeTypes.EventName.INSTALL,
      data: {}
    };
    const rejectMsg: NodeMessage = {
      event: NodeTypes.EventName.REJECT_INSTALL,
      data: {}
    };

    nodeA.on(NodeTypes.EventName.REJECT_INSTALL, (msg: NodeMessage) => {
      expect(msg.from).toEqual(nodeB.address);
      expect(msg.event).toEqual(NodeTypes.EventName.REJECT_INSTALL);
      done();
    });

    nodeB.on(NodeTypes.EventName.INSTALL, async (msg: NodeMessage) => {
      expect(msg.from).toEqual(nodeA.address);
      expect(msg.event).toEqual(NodeTypes.EventName.INSTALL);
      await nodeB.send(nodeA.address, rejectMsg);
    });
    nodeA.send(nodeB.address, proposalMsg);
  });
});
