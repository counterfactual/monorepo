import { Node as NodeTypes } from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { bigNumberify } from "ethers/utils";

import {
  InstallVirtualMessage,
  Node,
  NODE_EVENTS,
  ProposeVirtualMessage,
  UpdateStateMessage
} from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  generateGetStateRequest,
  generateTakeActionRequest,
  getMultisigCreationTransactionHash,
  makeInstallVirtualRequest,
  makeTTTVirtualAppInstanceProposalReq
} from "./utils";

describe("Node method follows spec - takeAction virtual", () => {
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
    "Node A and C install an AppInstance through Node B, Node A takes action, " +
      "Node C confirms receipt of state update",
    () => {
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

      it("sends takeAction with invalid appInstanceId", async () => {
        const takeActionReq = generateTakeActionRequest("", {
          foo: "bar"
        });

        expect(nodeA.call(takeActionReq.type, takeActionReq)).rejects.toEqual(
          ERRORS.NO_APP_INSTANCE_FOR_TAKE_ACTION
        );
      });

      it("can take action", async done => {
        const validAction = {
          actionType: 0,
          playX: 0,
          playY: 0,
          winClaim: {
            winClaimType: 0,
            idx: 0
          }
        };

        nodeA.once(NODE_EVENTS.CREATE_CHANNEL, async () => {
          nodeC.once(NODE_EVENTS.CREATE_CHANNEL, async () => {
            const tttAppInstanceProposalReq = makeTTTVirtualAppInstanceProposalReq(
              nodeC.publicIdentifier,
              global["networkContext"].TicTacToe,
              initialState,
              {
                stateEncoding,
                actionEncoding
              },
              [nodeB.publicIdentifier]
            );

            let newState;

            nodeC.on(
              NODE_EVENTS.UPDATE_STATE,
              async (msg: UpdateStateMessage) => {
                const getStateReq = generateGetStateRequest(
                  msg.data.appInstanceId
                );
                const response = await nodeC.call(
                  getStateReq.type,
                  getStateReq
                );
                const updatedState = (response.result as NodeTypes.GetStateResult)
                  .state;
                expect(updatedState).toEqual(newState);
                done();
              }
            );

            nodeA.on(
              NODE_EVENTS.INSTALL_VIRTUAL,
              async (msg: InstallVirtualMessage) => {
                const takeActionReq = generateTakeActionRequest(
                  msg.data.params.appInstanceId,
                  validAction
                );

                const response = await nodeA.call(
                  takeActionReq.type,
                  takeActionReq
                );
                newState = (response.result as NodeTypes.TakeActionResult)
                  .newState;

                expect(newState.board[0][0]).toEqual(bigNumberify(1));
                expect(newState.turnNum).toEqual(bigNumberify(1));
              }
            );

            nodeC.on(
              NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
              (msg: ProposeVirtualMessage) => {
                const installReq = makeInstallVirtualRequest(
                  msg.data.appInstanceId,
                  msg.data.params.intermediaries
                );
                nodeC.emit(installReq.type, installReq);
              }
            );

            nodeA.emit(
              tttAppInstanceProposalReq.type,
              tttAppInstanceProposalReq
            );
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
