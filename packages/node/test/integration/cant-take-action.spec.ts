import { Node as NodeTypes } from "@counterfactual/types";
import { AddressZero } from "ethers/constants";

import { InstallMessage, Node, NODE_EVENTS, ProposeMessage } from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  generateTakeActionRequest,
  getMultisigCreationTransactionHash,
  makeInstallRequest,
  makeTTTAppInstanceProposalReq
} from "./utils";

describe("Node method follows spec - fails with improper action taken", () => {
  jest.setTimeout(20000);

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
    const stateEncoding =
      "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)";
    const actionEncoding =
      "tuple(uint8 actionType, uint256 playX, uint256 playY, tuple(uint8 winClaimType, uint256 idx) winClaim)";

    const initialState = {
      players: [AddressZero, AddressZero],
      turnNum: 0,
      winner: 0,
      board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    };

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
          initialState,
          {
            stateEncoding,
            actionEncoding
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
