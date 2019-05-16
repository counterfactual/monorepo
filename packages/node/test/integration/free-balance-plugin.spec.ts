import { Node, Plugin } from "../../src";
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
    let freeBalancePluginNodeA: Plugin;
    // let freeBalancePluginNodeB: Plugin;
    const ethBucketAddress = global["networkContext"].ETHBucket;

    beforeAll(() => {
      freeBalancePluginNodeA = new FreeBalancePlugin(nodeA);
      // freeBalancePluginNodeB = new FreeBalancePlugin(nodeB);
    });

    it("node can register and unregister a plugin", () => {
      nodeA.registerPlugin(freeBalancePluginNodeA, ethBucketAddress);
      expect(nodeA.getPlugin(ethBucketAddress)).toEqual(freeBalancePluginNodeA);
      nodeA.unregisterPlugin(ethBucketAddress);
      expect(nodeA.plugins).toEqual(new Map());
    });

    it("can take valid install proposal for the ethBucket app", async () => {
      await createChannel(nodeA, nodeB);
    });
  });
});
