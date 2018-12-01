import Node from "../../src/node";

import { A_PRIVATE_KEY, MOCK_FIRESTORE } from "../env";

describe("Primitive Node operations", () => {
  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", () => {
    const node = new Node(A_PRIVATE_KEY, MOCK_FIRESTORE);
    expect(node).toBeDefined();
  });
});
