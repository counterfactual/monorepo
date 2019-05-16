import { One } from "ethers/constants";

import { Node, Plugin } from "../../src";
import { InstallParams, UpdateParams } from "../../src/machine";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import { collateralizeChannel, createChannel, sleep } from "./utils";

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
    let freeBalancePluginNodeB: Plugin;
    const ethBucketAddress = global["networkContext"].ETHBucket;

    beforeAll(() => {
      freeBalancePluginNodeA = new FreeBalanceRejectionPlugin(nodeA);
      freeBalancePluginNodeB = new FreeBalanceRejectionPlugin(nodeB);
    });

    it("node can register and unregister a plugin", () => {
      nodeA.registerPlugin(freeBalancePluginNodeA, ethBucketAddress);
      expect(nodeA.getPlugin(ethBucketAddress)).toEqual(freeBalancePluginNodeA);
      nodeA.unregisterPlugin(ethBucketAddress);
      expect(nodeA.plugins).toEqual(new Map());
    });

    it("can reject an invalid new state proposal for the FreeBalance", async () => {
      const multisigAddress = await createChannel(nodeA, nodeB);
      await collateralizeChannel(nodeA, nodeB, multisigAddress, One);
      nodeA.registerPlugin(freeBalancePluginNodeA, ethBucketAddress);
      nodeB.registerPlugin(freeBalancePluginNodeB, ethBucketAddress);

      await sleep(500);
    });
  });
});

class FreeBalanceRejectionPlugin implements Plugin {
  // register against & listen on node events
  constructor(readonly node: Node) {
    console.log("creating plugin for a new node: ", node.publicIdentifier);
  }

  onProposedInstall(params: InstallParams): boolean {
    return false;
  }

  onProposedNewState(params: UpdateParams): boolean {
    console.log("calling plugin new state validation function");
    return false;
  }
}
