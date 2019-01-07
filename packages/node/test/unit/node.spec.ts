import dotenv from "dotenv-extended";

import { Node } from "../../src/node";
import { EMPTY_NETWORK } from "../integration/utils";
import { MOCK_MESSAGING_SERVICE } from "../mock-services/mock-messaging-service";
import { MOCK_STORE_SERVICE } from "../mock-services/mock-store-service";

dotenv.load();

describe("Primitive Node operations", () => {
  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", () => {
    const nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };
    const node = new Node(
      process.env.A_PRIVATE_KEY!,
      MOCK_MESSAGING_SERVICE,
      MOCK_STORE_SERVICE,
      EMPTY_NETWORK,
      nodeConfig
    );
    expect(node).toBeDefined();
  });
});
