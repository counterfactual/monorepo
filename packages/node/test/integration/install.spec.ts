import { NetworkContextForTestSuite } from "@counterfactual/chain/src/contract-deployments.jest";
import { Node as NodeTypes } from "@counterfactual/types";

import { Node, NULL_INITIAL_STATE_FOR_PROPOSAL } from "../../src";
import { InstallMessage, NODE_EVENTS, ProposeMessage } from "../../src/types";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  confirmProposedAppInstanceOnNode,
  createChannel,
  getAppInstanceProposal,
  getInstalledAppInstances,
  makeInstallCall,
  makeProposeCall,
  makeTTTProposalRequest
} from "./utils";

describe("Node method follows spec - proposeInstall", () => {
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
  });

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it, " +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      it("sends proposal with non-null initial state", async done => {
        const multisigAddress = await createChannel(nodeA, nodeB);
        await collateralizeChannel(nodeA, nodeB, multisigAddress);
        let appInstanceId: string;
        let proposalParams: NodeTypes.ProposeInstallParams;

        nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
          await confirmProposedAppInstanceOnNode(
            proposalParams,
            await getAppInstanceProposal(nodeA, appInstanceId)
          );
          makeInstallCall(nodeB, msg.data.appInstanceId);
        });

        nodeA.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
          const [appInstanceNodeA] = await getInstalledAppInstances(nodeA);
          const [appInstanceNodeB] = await getInstalledAppInstances(nodeB);
          expect(appInstanceNodeA).toEqual(appInstanceNodeB);
          done();
        });

        const result = await makeProposeCall(nodeA, nodeB);
        appInstanceId = result.appInstanceId;
        proposalParams = result.params;
      });

      it("sends proposal with null initial state", async () => {
        const appInstanceProposalReq = makeTTTProposalRequest(
          nodeA.publicIdentifier,
          nodeB.publicIdentifier,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
        );

        expect(
          nodeA.rpcRouter.dispatch(appInstanceProposalReq)
        ).rejects.toEqual(NULL_INITIAL_STATE_FOR_PROPOSAL);
      });
    }
  );
});
