import dotenv from "dotenv";
import FirebaseServer from "firebase-server";

import { IStoreService, Node } from "../../src";

import { A_PRIVATE_KEY, B_PRIVATE_KEY } from "../env";
import { MOCK_MESSAGING_SERVICE } from "../mock-services/mock-messaging-service";

import FirebaseServiceFactory from "./services/firebase-service";

dotenv.config();

describe("Two nodes can communicate with each other", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  // @ts-ignore
  let nodeA: Node;
  // @ts-ignore
  let nodeB: Node;

  beforeAll(() => {
    const firebaseServiceFactory = new FirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    storeService = firebaseServiceFactory.createStoreService();
  });

  beforeEach(() => {
    nodeA = new Node(A_PRIVATE_KEY, MOCK_MESSAGING_SERVICE, storeService);
    nodeB = new Node(B_PRIVATE_KEY, MOCK_MESSAGING_SERVICE, storeService);
  });

  afterAll(() => {
    firebaseServer.close();
  });
});
