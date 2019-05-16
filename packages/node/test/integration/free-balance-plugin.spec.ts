import { Node } from "../../src";
import { FreeBalancePlugin } from "../../src/default-plugins/freeBalancePlugin";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import { createChannel } from "./utils";

describe("Node uses the freeBalancePlugin to simluate payment app functionality", () => {
  let nodeA: Node;
  let nodeB: Node;
  let firebaseServiceFactory: LocalFirebaseServiceFactory;

  beforeAll(async () => {
    const result = await setup(global);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    firebaseServiceFactory = result.firebaseServiceFactory;
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  describe("Nodes register the plugin", () => {
    it("can take valid install proposal", async () => {
      await createChannel(nodeA, nodeB);
      const freeBalancePlugin = new FreeBalancePlugin(nodeA);
      console.log(freeBalancePlugin);
    });
  });
});
