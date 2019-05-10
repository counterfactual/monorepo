import { AssetType } from "@counterfactual/types";

import { Node } from "../../src";
import { ERRORS } from "../../src/methods/errors";
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
        // Because uninstall looks up a mapping of AppInstanceId to multisig
        // address to identify which channel an AppInstance is in, and because
        // this mapping does not exist for FreeBalances (because it's a default app)
        // even if given a correct FreeBalance AppInstanceId, the lookup fails
        // and it cannot be uninstalled
        expect(e.toString()).toMatch(ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID);
      }
    });
  });
});
