import { Node as NodeTypes } from "@counterfactual/types";
import { One, Zero } from "ethers/constants";

import { Node } from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { InstallMessage, NODE_EVENTS, ProposeMessage } from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  collateralizeChannel,
  confirmProposedAppInstanceOnNode,
  createChannel,
  getInstalledAppInstances,
  getProposedAppInstanceInfo,
  makeInstallCall,
  makeProposeCall,
  makeTTTProposalRequest,
  sanitizeAppInstances
} from "./utils";

describe("Node method follows spec - proposeInstall", () => {
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
    "Node A gets app install proposal, sends to node B, B approves it, installs it, " +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      it("sends proposal with non-null initial state", async done => {
        const multisigAddress = await createChannel(nodeA, nodeB);
        await collateralizeChannel(nodeA, nodeB, multisigAddress);
        let appInstanceId: string;
        let proposalParams: NodeTypes.ProposeInstallParams;

        nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
          confirmProposedAppInstanceOnNode(
            proposalParams,
            await getProposedAppInstanceInfo(nodeA, appInstanceId)
          );
          makeInstallCall(nodeB, msg.data.appInstanceId);
        });

        nodeA.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
          const [appInstanceNodeA] = await getInstalledAppInstances(nodeA);
          const [appInstanceNodeB] = await getInstalledAppInstances(nodeB);

          expect(appInstanceNodeA.myDeposit).toEqual(One);
          expect(appInstanceNodeA.peerDeposit).toEqual(Zero);
          expect(appInstanceNodeB.myDeposit).toEqual(Zero);
          expect(appInstanceNodeB.peerDeposit).toEqual(One);

          sanitizeAppInstances([appInstanceNodeA, appInstanceNodeB]);
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
          global["networkContext"].TicTacToe
        );

        expect(
          nodeA.call(appInstanceProposalReq.type, appInstanceProposalReq)
        ).rejects.toEqual(ERRORS.NULL_INITIAL_STATE_FOR_PROPOSAL);
      });
    }
  );
});
