import { One } from "ethers/constants";

import { ERRORS, Node, NODE_EVENTS, Plugin } from "../../src";
import { InstallParams, UpdateParams } from "../../src/machine";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import { collateralizeChannel, createChannel, sendFunds } from "./utils";

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

    it("can reject an invalid new state proposal for the FreeBalance", async done => {
      const multisigAddress = await createChannel(nodeA, nodeB);
      await collateralizeChannel(nodeA, nodeB, multisigAddress, One);
      nodeA.registerPlugin(freeBalancePluginNodeA, ethBucketAddress);
      nodeB.registerPlugin(freeBalancePluginNodeB, ethBucketAddress);

      nodeB.on(NODE_EVENTS.REJECT_STATE, (reason: string) => {
        expect(reason).toEqual(ERRORS.INVALID_STATE_TRANSITION_PROPOSAL);
        done();
      });

      await sendFunds(nodeA, nodeB, One);
    });
  });
});

class FreeBalanceRejectionPlugin implements Plugin {
  constructor(readonly node: Node) {
    console.log("creating plugin for a new node: ", node.publicIdentifier);
  }

  onProposedInstall(params: InstallParams): boolean {
    return false;
  }

  onProposedNewState(params: UpdateParams): boolean {
    return false;
  }
}
