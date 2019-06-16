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
  createChannel,
  generateGetStateRequest,
  generateTakeActionRequest,
  installTTTApp
} from "./utils";

describe("Node method follows spec - takeAction", () => {
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
  });

  describe(
    "Node A and B install an AppInstance, Node A takes action, " +
      "Node B confirms receipt of state update",
    () => {
      it("sends takeAction with invalid appInstanceId", async () => {
        const takeActionReq = generateTakeActionRequest("", validAction);

        expect(nodeA.router.dispatch(takeActionReq)).rejects.toEqual(
          NO_APP_INSTANCE_FOR_TAKE_ACTION
        );
      });

      it("can take action", async done => {
        await createChannel(nodeA, nodeB);
        const appInstanceId = await installTTTApp(nodeA, nodeB);

        let newState: SolidityABIEncoderV2Type;

        nodeB.on(NODE_EVENTS.UPDATE_STATE, async (msg: UpdateStateMessage) => {
          const getStateReq = generateGetStateRequest(msg.data.appInstanceId);

          const response = (await nodeB.router.dispatch(
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
        expect(newState["turnNum"]).toEqual(bigNumberify(1));
      });
    }
  );
});
