import dotenv from "dotenv";
import FirebaseServer from "firebase-server";

import { IStoreService, Node } from "../../src";

import { A_PRIVATE_KEY } from "../env";
import { MOCK_MESSAGING_SERVICE } from "../mock-services/mock-messaging-service";

import FirebaseServiceFactory from "./services/firebase-service";

dotenv.config();

describe("Node can use storage service", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let node: Node;

  beforeAll(() => {
    const firebaseServiceFactory = new FirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    storeService = firebaseServiceFactory.createStoreService(
      process.env.STORE_SERVER_KEY!
    );
    node = new Node(A_PRIVATE_KEY, MOCK_MESSAGING_SERVICE, storeService);
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("Node fails to get data with invalid key", async () => {
    expect(await node.get("installMsg")).toEqual(null);
  });

  it("Node can store and retrieve some data correctly", async () => {
    const msg = { method: "INSTALL" };
    await node.set("installMsg", msg);
    expect(await node.get("installMsg")).toEqual(msg);
  });
});
