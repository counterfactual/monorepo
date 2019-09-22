import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";
import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";
import { NODE_EVENTS, ProposeMessage } from "../../src/types";

import {
  SetupContext,
  setupWithMemoryMessagingAndPostgresStore
} from "./setup";
import {
  confirmProposedVirtualAppInstance,
  constructRejectInstallRpc,
  createChannel,
  getProposedAppInstances,
  makeVirtualProposeCall
} from "./utils";

const { TicTacToeApp } = global["networkContext"] as NetworkContextForTestSuite;

describe("Node method follows spec - rejectInstallVirtual", () => {
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  beforeAll(async () => {
    const context: SetupContext = await setupWithMemoryMessagingAndPostgresStore(
      global,
      true,
      true
    );
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    nodeC = context["C"].node;
  });

  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. Node C rejects proposal. Node A confirms rejection",
    () => {
      it("sends proposal with non-null initial state", async done => {
        await createChannel(nodeA, nodeB);
        await createChannel(nodeB, nodeC);

        let proposalParams: NodeTypes.ProposeInstallVirtualParams;

        nodeA.on(NODE_EVENTS.REJECT_INSTALL_VIRTUAL, async () => {
          expect((await getProposedAppInstances(nodeA)).length).toEqual(0);
          done();
        });

        nodeC.on(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          async (msg: ProposeMessage) => {
            const { appInstanceId } = msg.data;

            const [proposedAppInstanceA] = await getProposedAppInstances(nodeA);
            const [proposedAppInstanceC] = await getProposedAppInstances(nodeC);

            confirmProposedVirtualAppInstance(
              proposalParams,
              proposedAppInstanceA
            );

            confirmProposedVirtualAppInstance(
              proposalParams,
              proposedAppInstanceC
            );

            expect(proposedAppInstanceC.proposedByIdentifier).toEqual(
              nodeA.publicIdentifier
            );
            expect(proposedAppInstanceA.identityHash).toEqual(
              proposedAppInstanceC.identityHash
            );

            const rejectReq = constructRejectInstallRpc(appInstanceId);

            await nodeC.rpcRouter.dispatch(rejectReq);

            expect((await getProposedAppInstances(nodeC)).length).toEqual(0);
          }
        );

        const result = await makeVirtualProposeCall(
          nodeA,
          nodeC,
          nodeB,
          TicTacToeApp
        );

        proposalParams = result.params;
      });
    }
  );
});
