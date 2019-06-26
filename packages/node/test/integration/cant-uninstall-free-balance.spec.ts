import { CANNOT_UNINSTALL_FREE_BALANCE, Node } from "../../src";
import { StateChannel } from "../../src/models";

import { setup, SetupContext } from "./setup";
import { createChannel, generateUninstallRequest } from "./utils";

describe("Confirms that a FreeBalance cannot be uninstalled", () => {
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
  });

  describe("Node A and B open channel, attempt to uninstall FreeBalance", () => {
    it("can't uninstall FreeBalance", async () => {
      const multisigAddress = await createChannel(nodeA, nodeB);

      // channel to expose the FreeBalance appInstanceId
      const channel = StateChannel.setupChannel(
        global["networkContext"].CoinBucket,
        multisigAddress,
        [nodeA.publicIdentifier, nodeB.publicIdentifier]
      );

      const fbUninstallReq = generateUninstallRequest(
        channel.freeBalance.identityHash
      );

      let error;
      try {
        await nodeA.call(fbUninstallReq.type, fbUninstallReq);
      } catch (e) {
        error = e;
      } finally {
        expect(error.toString()).toMatch(
          CANNOT_UNINSTALL_FREE_BALANCE(multisigAddress)
        );
      }
    });
  });
});
