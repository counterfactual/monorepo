import { AssetType } from "@counterfactual/types";

import { CANNOT_UNINSTALL_FREE_BALANCE, Node } from "../../src";
import { StateChannel } from "../../src/models";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import { createChannel, generateUninstallRequest } from "./utils";

describe("Confirms that a FreeBalance cannot be uninstalled", () => {
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

  describe("Node A and B open channel, attempt to uninstall FreeBalance", () => {
    it("can't uninstall FreeBalance", async () => {
      const multisigAddress = await createChannel(nodeA, nodeB);

      // channel to expose the FreeBalance appInstanceId
      const channel = StateChannel.setupChannel(
        global["networkContext"].ETHBucket,
        multisigAddress,
        [nodeA.publicIdentifier, nodeB.publicIdentifier]
      );

      const fbUninstallReq = generateUninstallRequest(
        channel.getFreeBalanceFor(AssetType.ETH).identityHash
      );

      try {
        await nodeA.call(fbUninstallReq.type, fbUninstallReq);
      } catch (e) {
        expect(e.toString()).toMatch(
          CANNOT_UNINSTALL_FREE_BALANCE(multisigAddress)
        );
      }
    });
  });
});
