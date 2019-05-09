import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";
import {
  NODE_EVENTS,
  ProposeVirtualMessage,
  RejectProposalMessage
} from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  confirmProposedVirtualAppInstanceOnNode,
  getMultisigCreationTransactionHash,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest,
  makeRejectInstallRequest
} from "./utils";

describe("Node method follows spec - rejectInstallVirtual", () => {
  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  beforeAll(async () => {
    const result = await setup(global, true);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    nodeC = result.nodeC!;
    firebaseServiceFactory = result.firebaseServiceFactory;
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });
  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. Node C rejects proposal. Node A confirms rejection",
    () => {
      it("sends proposal with non-null initial state", async done => {
        nodeA.once(NODE_EVENTS.CREATE_CHANNEL, async () => {
          nodeC.once(NODE_EVENTS.CREATE_CHANNEL, async () => {
            const intermediaries = [nodeB.publicIdentifier];
            const installVirtualAppInstanceProposalRequest = makeInstallVirtualProposalRequest(
              nodeC.publicIdentifier,
              intermediaries
            );

            nodeA.on(
              NODE_EVENTS.REJECT_INSTALL_VIRTUAL,
              async (msg: RejectProposalMessage) => {
                expect((await getProposedAppInstances(nodeA)).length).toEqual(
                  0
                );
                done();
              }
            );

            nodeC.on(
              NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
              async (msg: ProposeVirtualMessage) => {
                const proposedAppInstanceA = (await getProposedAppInstances(
                  nodeA
                ))[0];
                const proposedAppInstanceC = (await getProposedAppInstances(
                  nodeC
                ))[0];

                confirmProposedVirtualAppInstanceOnNode(
                  installVirtualAppInstanceProposalRequest.params,
                  proposedAppInstanceA
                );
                confirmProposedVirtualAppInstanceOnNode(
                  installVirtualAppInstanceProposalRequest.params,
                  proposedAppInstanceC
                );

                expect(proposedAppInstanceC.proposedByIdentifier).toEqual(
                  nodeA.publicIdentifier
                );
                expect(proposedAppInstanceA.id).toEqual(
                  proposedAppInstanceC.id
                );

                const rejectReq = makeRejectInstallRequest(
                  msg.data.appInstanceId
                );

                await nodeC.call(rejectReq.type, rejectReq);

                expect((await getProposedAppInstances(nodeC)).length).toEqual(
                  0
                );
              }
            );

            const response = await nodeA.call(
              installVirtualAppInstanceProposalRequest.type,
              installVirtualAppInstanceProposalRequest
            );
            const appInstanceId = (response.result as NodeTypes.ProposeInstallVirtualResult)
              .appInstanceId;
            expect(appInstanceId).toBeDefined();
          });

          await getMultisigCreationTransactionHash(nodeB, [
            nodeB.publicIdentifier,
            nodeC.publicIdentifier
          ]);
        });

        await getMultisigCreationTransactionHash(nodeA, [
          nodeA.publicIdentifier,
          nodeB.publicIdentifier
        ]);
      });
    }
  );
});
