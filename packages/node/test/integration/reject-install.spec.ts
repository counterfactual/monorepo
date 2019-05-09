import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";
import {
  NODE_EVENTS,
  ProposeMessage,
  RejectProposalMessage
} from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  confirmProposedAppInstanceOnNode,
  getInstalledAppInstances,
  getMultisigCreationTransactionHash,
  getProposedAppInstanceInfo,
  getProposedAppInstances,
  makeInstallProposalRequest,
  makeRejectInstallRequest
} from "./utils";

describe("Node method follows spec - rejectInstall", () => {
  jest.setTimeout(10000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const result = await setup(global);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    firebaseServiceFactory = result.firebaseServiceFactory;
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it," +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      it("sends proposal with non-null initial state", async done => {
        nodeA.on(NODE_EVENTS.CREATE_CHANNEL, async () => {
          expect(await getInstalledAppInstances(nodeA)).toEqual([]);
          expect(await getInstalledAppInstances(nodeB)).toEqual([]);

          let appInstanceId;

          // second, an app instance must be proposed to be installed into that channel
          const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
            nodeB.publicIdentifier
          );

          nodeA.on(
            NODE_EVENTS.REJECT_INSTALL,
            async (msg: RejectProposalMessage) => {
              expect((await getProposedAppInstances(nodeA)).length).toEqual(0);
              done();
            }
          );

          // node B then decides to reject the proposal
          nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
            confirmProposedAppInstanceOnNode(
              appInstanceInstallationProposalRequest.params,
              await getProposedAppInstanceInfo(nodeA, appInstanceId)
            );

            const rejectReq = makeRejectInstallRequest(msg.data.appInstanceId);

            // Node A should have a proposal in place before Node B rejects it
            expect((await getProposedAppInstances(nodeA)).length).toEqual(1);

            await nodeB.call(rejectReq.type, rejectReq);

            expect((await getProposedAppInstances(nodeB)).length).toEqual(0);
          });

          const response = await nodeA.call(
            appInstanceInstallationProposalRequest.type,
            appInstanceInstallationProposalRequest
          );
          appInstanceId = (response.result as NodeTypes.ProposeInstallResult)
            .appInstanceId;
        });
        await getMultisigCreationTransactionHash(nodeA, [
          nodeA.publicIdentifier,
          nodeB.publicIdentifier
        ]);
      });
    }
  );
});
