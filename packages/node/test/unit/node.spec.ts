import * as ethers from "ethers";

import Node from "../../src/node";

import { firestore, networkContext, privateKey, provider } from "./env";

describe("Node operations", () => {
  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", () => {
    const node = new Node(privateKey, provider, firestore, networkContext);
    expect(node).toBeDefined();
  });

  it("can create a multisig", async () => {
    const node = new Node(privateKey, provider, firestore, networkContext);
    const multisig = await node.createMultisig(ethers.constants.AddressZero);
    expect(multisig).toBeDefined();
  });
});
