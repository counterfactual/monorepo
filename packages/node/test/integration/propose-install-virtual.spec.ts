import { Node as NodeTypes } from "@counterfactual/types";
import { One, Zero } from "ethers/constants";

import { Node } from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { NODE_EVENTS, ProposeVirtualMessage } from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  confirmProposedVirtualAppInstanceOnNode,
  getMultisigCreationTransactionHash,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest
} from "./utils";

describe("Node method follows spec - proposeInstallVirtual", () => {
  jest.setTimeout(20000);

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
      "Virtual AppInstance with Node C. All Nodes confirm receipt of proposal",
    () => {
      it("sends proposal with non-null initial state", async done => {
        nodeA.once(NODE_EVENTS.CREATE_CHANNEL, async () => {
          nodeC.once(NODE_EVENTS.CREATE_CHANNEL, async () => {
            const intermediaries = [nodeB.publicIdentifier];
            const installVirtualAppInstanceProposalRequest = makeInstallVirtualProposalRequest(
              nodeC.publicIdentifier,
              intermediaries,
              false,
              One,
              Zero
            );

            nodeC.on(
              NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
              async (msg: ProposeVirtualMessage) => {
                const proposedAppInstanceA = (await getProposedAppInstances(
                  nodeA
                ))[0];
                const proposedAppInstanceB = (await getProposedAppInstances(
                  nodeB
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
                  proposedAppInstanceB,
                  true
                );
                confirmProposedVirtualAppInstanceOnNode(
                  installVirtualAppInstanceProposalRequest.params,
                  proposedAppInstanceC,
                  true
                );

                expect(proposedAppInstanceC.proposedByIdentifier).toEqual(
                  nodeA.publicIdentifier
                );
                expect(proposedAppInstanceA.id).toEqual(
                  proposedAppInstanceB.id
                );
                expect(proposedAppInstanceB.id).toEqual(
                  proposedAppInstanceC.id
                );
                expect(proposedAppInstanceA.myDeposit).toEqual(One);
                expect(proposedAppInstanceA.peerDeposit).toEqual(Zero);
                expect(proposedAppInstanceC.myDeposit).toEqual(Zero);
                expect(proposedAppInstanceC.peerDeposit).toEqual(One);
                done();
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

      it("sends proposal with null initial state", async () => {
        const intermediaries = [nodeB.publicIdentifier];
        const installVirtualAppInstanceProposalRequest = makeInstallVirtualProposalRequest(
          nodeC.publicIdentifier,
          intermediaries,
          true
        );

        expect(
          nodeA.call(
            installVirtualAppInstanceProposalRequest.type,
            installVirtualAppInstanceProposalRequest
          )
        ).rejects.toEqual(ERRORS.NULL_INITIAL_STATE_FOR_PROPOSAL);
      });
    }
  );
});
