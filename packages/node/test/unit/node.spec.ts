import dotenv from "dotenv";

import { Node } from "../../src/node";
import { A_PRIVATE_KEY } from "../env";
import { MOCK_MESSAGING_SERVICE } from "../mock-services/mock-messaging-service";
import { MOCK_STORE_SERVICE } from "../mock-services/mock-store-service";

dotenv.config();

describe("Primitive Node operations", () => {
  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", () => {
    const nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };
    const node = new Node(
      A_PRIVATE_KEY,
      MOCK_MESSAGING_SERVICE,
      MOCK_STORE_SERVICE,
      nodeConfig
    );
    expect(node).toBeDefined();
  });
});
