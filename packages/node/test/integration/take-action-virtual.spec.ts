import {
  Node as NodeTypes,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

import {
  JsonRpcResponse,
  NO_APP_INSTANCE_FOR_TAKE_ACTION,
  Node,
  NODE_EVENTS,
  UpdateStateMessage
} from "../../src";

import { setup, SetupContext } from "./setup";
import { validAction } from "./tic-tac-toe";
import {
  collateralizeChannel,
  createChannel,
  generateGetStateRequest,
  generateTakeActionRequest,
  installTTTAppVirtual
} from "./utils";

describe("Node method follows spec - takeAction virtual", () => {
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global, true, true);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    nodeC = context["C"].node;
  });

  describe(
    "Node A and C install an AppInstance via Node B, Node A takes action, " +
      "Node C confirms receipt of state update",
    () => {
      it("sends takeAction with invalid appInstanceId", async () => {
        const takeActionReq = generateTakeActionRequest("", validAction);

        expect(nodeA.router.dispatch(takeActionReq)).rejects.toEqual(
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
          const response = (await nodeC.router.dispatch(
            getStateReq
          )) as JsonRpcResponse;
          const updatedState = (response.result as NodeTypes.GetStateResult)
            .state;
          expect(updatedState).toEqual(newState);
          done();
        });

        const takeActionReq = generateTakeActionRequest(
          appInstanceId,
          validAction
        );

        const response = (await nodeA.router.dispatch(
          takeActionReq
        )) as JsonRpcResponse;
        newState = (response.result as NodeTypes.TakeActionResult).newState;

        expect(newState["board"][0][0]).toEqual(bigNumberify(1));
        expect(newState["versionNumber"]).toEqual(bigNumberify(1));
      });
    }
  );
});
