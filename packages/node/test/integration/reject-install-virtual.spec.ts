import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";
import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";
import { NODE_EVENTS, ProposeMessage } from "../../src/types";

import { setup, SetupContext } from "./setup";
import {
  confirmProposedAppInstance,
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
    const context: SetupContext = await setup(global, true, false);
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

        nodeA.on(NODE_EVENTS.REJECT_INSTALL_VIRTUAL, async () => {
          expect((await getProposedAppInstances(nodeA)).length).toEqual(0);
          done();
        });

        nodeC.once(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          async ({ data: { params, appInstanceId } }: ProposeMessage) => {
            const [proposedAppInstanceC] = await getProposedAppInstances(nodeC);

            confirmProposedAppInstance(params, proposedAppInstanceC);

            expect(proposedAppInstanceC.proposedByIdentifier).toEqual(
              nodeA.publicIdentifier
            );

            const rejectReq = constructRejectInstallRpc(appInstanceId);
            await nodeC.rpcRouter.dispatch(rejectReq);
            expect((await getProposedAppInstances(nodeC)).length).toEqual(0);
          }
        );

        const { params } = await makeVirtualProposeCall(
          nodeA,
          nodeC,
          nodeB,
          TicTacToeApp
        );

        const [proposedAppInstanceA] = await getProposedAppInstances(nodeA);

        confirmProposedAppInstance(params, proposedAppInstanceA);
      });
    }
  );
});
