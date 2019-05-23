import {
  Node as NodeTypes,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

import {
  NO_APP_INSTANCE_FOR_TAKE_ACTION,
  Node,
  NODE_EVENTS,
  UpdateStateMessage
} from "../../src";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import { validAction } from "./tic-tac-toe";
import {
  collateralizeChannel,
  createChannel,
  generateGetStateRequest,
  generateTakeActionRequest,
  installTTTAppVirtual
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
    "Node A and C install an AppInstance via Node B, Node A takes action, " +
      "Node C confirms receipt of state update",
    () => {
      it("sends takeAction with invalid appInstanceId", async () => {
        const takeActionReq = generateTakeActionRequest("", validAction);

        expect(nodeA.call(takeActionReq.type, takeActionReq)).rejects.toEqual(
          NO_APP_INSTANCE_FOR_TAKE_ACTION
        );
      });

      it("can take action", async done => {
        const multisigAddressAB = await createChannel(nodeA, nodeB);
        const multisigAddressBC = await createChannel(nodeB, nodeC);
        await collateralizeChannel(nodeA, nodeB, multisigAddressAB);
        await collateralizeChannel(nodeB, nodeC, multisigAddressBC);

        const appInstanceId = await installTTTAppVirtual(nodeA, nodeB, nodeC);

        let newState: SolidityABIEncoderV2Type;

        nodeC.on(NODE_EVENTS.UPDATE_STATE, async (msg: UpdateStateMessage) => {
          const getStateReq = generateGetStateRequest(msg.data.appInstanceId);
          const response = await nodeC.call(getStateReq.type, getStateReq);
          const updatedState = (response.result as NodeTypes.GetStateResult)
            .state;
          expect(updatedState).toEqual(newState);
          done();
        });

        const takeActionReq = generateTakeActionRequest(
          appInstanceId,
          validAction
        );

        const response = await nodeA.call(takeActionReq.type, takeActionReq);
        newState = (response.result as NodeTypes.TakeActionResult).newState;

        expect(newState["board"][0][0]).toEqual(bigNumberify(1));
        expect(newState["turnNum"]).toEqual(bigNumberify(1));
      });
    }
  );
});
