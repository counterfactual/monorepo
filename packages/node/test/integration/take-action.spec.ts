import {
  Address,
  AppABIEncodings,
  AssetType,
  Node as NodeTypes,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { AddressZero, One, Zero } from "ethers/constants";
import { bigNumberify } from "ethers/utils";
import { v4 as generateUUID } from "uuid";

import {
  InstallMessage,
  Node,
  NODE_EVENTS,
  ProposeMessage,
  UpdateStateMessage
} from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  initialEmptyTTTState,
  tttActionEncoding,
  tttStateEncoding
} from "./tic-tac-toe";
import {
  generateGetStateRequest,
  generateTakeActionRequest,
  getMultisigCreationTransactionHash,
  makeInstallRequest
} from "./utils";

describe("Node method follows spec - takeAction", () => {
  jest.setTimeout(20000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const result = await setup(global);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    firebaseServiceFactory = result.firebaseServiceFactory;
  });

  afterAll(async () => {
    await firebaseServiceFactory.closeServiceConnections();
  });

  describe(
    "Node A and B install an AppInstance, Node A takes action, " +
      "Node B confirms receipt of state update",
    () => {
      const initialState = initialEmptyTTTState([AddressZero, AddressZero]);

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

        const tttAppInstanceProposalReq = makeTTTAppInstanceProposalReq(
          nodeB.publicIdentifier,
          global["networkContext"].TicTacToe,
          initialState,
          {
            stateEncoding: tttStateEncoding,
            actionEncoding: tttActionEncoding
          }
        );

        let newState;

        nodeA.on(NODE_EVENTS.CREATE_CHANNEL, async () => {
          nodeB.on(
            NODE_EVENTS.UPDATE_STATE,
            async (msg: UpdateStateMessage) => {
              const getStateReq = generateGetStateRequest(
                msg.data.appInstanceId
              );

              const response = await nodeB.call(getStateReq.type, getStateReq);

              const updatedState = (response.result as NodeTypes.GetStateResult)
                .state;
              expect(updatedState).toEqual(newState);
              done();
            }
          );

          nodeA.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
            const takeActionReq = generateTakeActionRequest(
              msg.data.params.appInstanceId,
              validAction
            );

            const response = await nodeA.call(
              takeActionReq.type,
              takeActionReq
            );

            newState = (response.result as NodeTypes.TakeActionResult).newState;

            expect(newState.board[0][0]).toEqual(bigNumberify(1));
            expect(newState.turnNum).toEqual(bigNumberify(1));
          });

          nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, (msg: ProposeMessage) => {
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
    }
  );
});

function makeTTTAppInstanceProposalReq(
  proposedToIdentifier: string,
  appId: Address,
  initialState: SolidityABIEncoderV2Type,
  abiEncodings: AppABIEncodings
): NodeTypes.MethodRequest {
  return {
    params: {
      proposedToIdentifier,
      appId,
      initialState,
      abiEncodings,
      asset: {
        assetType: AssetType.ETH
      },
      myDeposit: Zero,
      peerDeposit: Zero,
      timeout: One
    } as NodeTypes.ProposeInstallParams,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.PROPOSE_INSTALL
  } as NodeTypes.MethodRequest;
}
