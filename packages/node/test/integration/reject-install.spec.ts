// @ts-ignore - firebase-server depends on node being transpiled first, circular dependency
import { LocalFirebaseServiceFactory } from "@counterfactual/firebase-server";
import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";
import {
  NODE_EVENTS,
  ProposeMessage,
  RejectProposalMessage
} from "../../src/types";

import { setup } from "./setup";
import {
  confirmProposedAppInstanceOnNode,
  createChannel,
  getInstalledAppInstances,
  getProposedAppInstanceInfo,
  getProposedAppInstances,
  makeProposeCall,
  makeRejectInstallRequest
} from "./utils";

describe("Node method follows spec - rejectInstall", () => {
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
        await createChannel(nodeA, nodeB);
        expect(await getInstalledAppInstances(nodeA)).toEqual([]);
        expect(await getInstalledAppInstances(nodeB)).toEqual([]);
        let appInstanceId: string;
        let params: NodeTypes.ProposeInstallParams;

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
            params,
            await getProposedAppInstanceInfo(nodeA, appInstanceId)
          );

          const rejectReq = makeRejectInstallRequest(msg.data.appInstanceId);
          expect((await getProposedAppInstances(nodeA)).length).toEqual(1);
          await nodeB.call(rejectReq.type, rejectReq);
          expect((await getProposedAppInstances(nodeB)).length).toEqual(0);
        });

        const result = await makeProposeCall(nodeA, nodeB);
        appInstanceId = result.appInstanceId;
        params = result.params;
      });
    }
  );
});
