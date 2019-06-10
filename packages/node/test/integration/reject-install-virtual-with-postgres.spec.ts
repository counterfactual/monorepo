// @ts-ignore - firebase-server depends on node being transpiled first, circular dependency
import { LocalFirebaseServiceFactory } from "@counterfactual/firebase-server";
import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";
import {
  NODE_EVENTS,
  ProposeVirtualMessage,
  RejectProposalMessage
} from "../../src/types";

import { setupWithMemoryMessagingAndPostgresStore } from "./setup";
import {
  confirmProposedVirtualAppInstanceOnNode,
  createChannel,
  getProposedAppInstances,
  makeRejectInstallRequest,
  makeVirtualProposeCall
} from "./utils";

describe("Node method follows spec - rejectInstallVirtual", () => {
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  beforeAll(async () => {
    const result = await setupWithMemoryMessagingAndPostgresStore(
      global,
      true,
      true
    );
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    nodeC = result.nodeC!;
  });

  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. Node C rejects proposal. Node A confirms rejection",
    () => {
      it("sends proposal with non-null initial state", async done => {
        await createChannel(nodeA, nodeB);
        await createChannel(nodeB, nodeC);
        let proposalParams: NodeTypes.ProposeInstallVirtualParams;

        nodeA.on(
          NODE_EVENTS.REJECT_INSTALL_VIRTUAL,
          async (msg: RejectProposalMessage) => {
            expect((await getProposedAppInstances(nodeA)).length).toEqual(0);
            done();
          }
        );

        nodeC.on(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          async (msg: ProposeVirtualMessage) => {
            const { appInstanceId } = msg.data;
            const [proposedAppInstanceA] = await getProposedAppInstances(nodeA);
            const [proposedAppInstanceC] = await getProposedAppInstances(nodeC);

            confirmProposedVirtualAppInstanceOnNode(
              proposalParams,
              proposedAppInstanceA
            );
            confirmProposedVirtualAppInstanceOnNode(
              proposalParams,
              proposedAppInstanceC
            );

            expect(proposedAppInstanceC.proposedByIdentifier).toEqual(
              nodeA.publicIdentifier
            );
            expect(proposedAppInstanceA.id).toEqual(proposedAppInstanceC.id);

            const rejectReq = makeRejectInstallRequest(appInstanceId);
            await nodeC.call(rejectReq.type, rejectReq);
            expect((await getProposedAppInstances(nodeC)).length).toEqual(0);
          }
        );

        const result = await makeVirtualProposeCall(nodeA, nodeC, nodeB);
        proposalParams = result.params;
      });
    }
  );
});
