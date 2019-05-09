import { Node as NodeTypes } from "@counterfactual/types";
import { AddressZero } from "ethers/constants";

import { InstallMessage, Node, NODE_EVENTS, ProposeMessage } from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  initialEmptyTTTState,
  tttActionEncoding,
  tttStateEncoding
} from "./tic-tac-toe";
import {
  generateTakeActionRequest,
  getMultisigCreationTransactionHash,
  makeInstallRequest,
  makeTTTAppInstanceProposalReq
} from "./utils";

describe("Node method follows spec - fails with improper action taken", () => {
  let nodeA: Node;
  let nodeB: Node;
  let firebaseServiceFactory: LocalFirebaseServiceFactory;

  beforeAll(async () => {
    const result = await setup(global);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    firebaseServiceFactory = result.firebaseServiceFactory;
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  describe("Node A and B install an AppInstance, Node A takes invalid action", () => {
    it("can't take invalid action", async done => {
      const validAction = {
        actionType: 1,
        playX: 0,
        playY: 0,
        winClaim: {
          winClaimType: 0,
          idx: 0
        }
      };

      nodeA.on(NODE_EVENTS.CREATE_CHANNEL, async () => {
        const tttAppInstanceProposalReq = makeTTTAppInstanceProposalReq(
          nodeB.publicIdentifier,
          global["networkContext"].TicTacToe,
          initialEmptyTTTState([AddressZero, AddressZero]),
          {
            stateEncoding: tttStateEncoding,
            actionEncoding: tttActionEncoding
          }
        );

        nodeA.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
          const takeActionReq = generateTakeActionRequest(
            msg.data.params.appInstanceId,
            validAction
          );

          try {
            await nodeA.call(takeActionReq.type, takeActionReq);
          } catch (e) {
            expect(e.toString()).toMatch(ERRORS.INVALID_ACTION);
            done();
          }
        });

        nodeB.on(NodeTypes.EventName.PROPOSE_INSTALL, (msg: ProposeMessage) => {
          const installReq = makeInstallRequest(msg.data.appInstanceId);
          nodeB.emit(installReq.type, installReq);
        });

        nodeA.emit(tttAppInstanceProposalReq.type, tttAppInstanceProposalReq);
      });
      await getMultisigCreationTransactionHash(nodeA, [
        nodeA.publicIdentifier,
        nodeB.publicIdentifier
      ]);
    });
  });
});
