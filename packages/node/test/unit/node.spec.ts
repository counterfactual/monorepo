import Node from "../../src/node";

import { firestore, networkContext, privateKey, provider } from "./env";

describe("Primitive Node operations", () => {
  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", () => {
    const node = new Node(privateKey, provider, firestore, networkContext);
    expect(node).toBeDefined();
  });
});
