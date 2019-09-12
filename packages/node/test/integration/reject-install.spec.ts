import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";
import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";
import { NODE_EVENTS, ProposeMessage } from "../../src/types";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  confirmProposedAppInstance,
  constructRejectInstallRpc,
  createChannel,
  getAppInstanceProposal,
  getInstalledAppInstances,
  getProposedAppInstances,
  makeAndSendProposeCall
} from "./utils";

describe("Node method follows spec - rejectInstall", () => {
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
  });

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it," +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      it("sends proposal with non-null initial state", async done => {
        const multisigAddress = await createChannel(nodeA, nodeB);
        await collateralizeChannel(multisigAddress, nodeA, nodeB);

        expect(await getInstalledAppInstances(nodeA)).toEqual([]);
        expect(await getInstalledAppInstances(nodeB)).toEqual([]);

        nodeA.on(NODE_EVENTS.REJECT_INSTALL, async () => {
          expect((await getProposedAppInstances(nodeA)).length).toEqual(0);
          done();
        });

        // node B then decides to reject the proposal
        nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
          const rejectReq = constructRejectInstallRpc(msg.data.appInstanceId);
          expect((await getProposedAppInstances(nodeA)).length).toEqual(1);
          await nodeB.rpcRouter.dispatch(rejectReq);
          expect((await getProposedAppInstances(nodeB)).length).toEqual(0);
        });

        const { params, appInstanceId } = await makeAndSendProposeCall(
          nodeA,
          nodeB,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
        );

        await confirmProposedAppInstance(
          params,
          await getAppInstanceProposal(nodeA, appInstanceId)
        );
      });
    }
  );
});
