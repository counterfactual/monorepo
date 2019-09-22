import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";
import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";
import { NODE_EVENTS, ProposeMessage } from "../../src/types";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  confirmProposedVirtualAppInstance,
  createChannel,
  getInstalledAppInstances,
  getProposedAppInstances,
  installTTTVirtual,
  makeVirtualProposal
} from "./utils";

const { TicTacToeApp } = global["networkContext"] as NetworkContextForTestSuite;

describe("Node method follows spec - proposeInstallVirtual", () => {
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global, true, true);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    nodeC = context["C"].node;
  });

  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. All Nodes confirm receipt of proposal",
    () => {
      it("sends proposal with non-null initial state", async done => {
        const multisigAddressAB = await createChannel(nodeA, nodeB);
        const multisigAddressBC = await createChannel(nodeB, nodeC);

        await collateralizeChannel(multisigAddressAB, nodeA, nodeB);
        await collateralizeChannel(multisigAddressBC, nodeB, nodeC);

        let proposalParams: NodeTypes.ProposeInstallVirtualParams;
        nodeA.once(NODE_EVENTS.INSTALL_VIRTUAL, async () => {
          const [virtualAppNodeA] = await getInstalledAppInstances(nodeA);

          const [virtualAppNodeC] = await getInstalledAppInstances(nodeC);

          expect(virtualAppNodeA).toEqual(virtualAppNodeC);

          done();
        });

        nodeC.once(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          async (msg: ProposeMessage) => {
            const { appInstanceId } = msg.data;

            const [proposedAppNodeA] = await getProposedAppInstances(nodeA);
            const [proposedAppNodeC] = await getProposedAppInstances(nodeC);

            confirmProposedVirtualAppInstance(proposalParams, proposedAppNodeA);
            confirmProposedVirtualAppInstance(
              proposalParams,
              proposedAppNodeC,
              true
            );

            expect(proposedAppNodeC.proposedByIdentifier).toEqual(
              nodeA.publicIdentifier
            );
            expect(proposedAppNodeA.identityHash).toEqual(
              proposedAppNodeC.identityHash
            );
            installTTTVirtual(nodeC, appInstanceId, nodeB.publicIdentifier);
          }
        );

        const result = await makeVirtualProposal(
          nodeA,
          nodeC,
          nodeB,
          TicTacToeApp
        );
        proposalParams = result.params as NodeTypes.ProposeInstallVirtualParams;
      });
    }
  );
});
