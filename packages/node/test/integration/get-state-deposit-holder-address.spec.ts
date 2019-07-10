import { Node as NodeTypes } from "@counterfactual/types";

import { jsonRpcDeserialize, JsonRpcResponse, Node } from "../../src";

import { setup, SetupContext } from "./setup";

describe("Node method follows spec - getStateDepositHolderAddress", () => {
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
  });

  it("can accept a valid call and return correctly formatted address", async () => {
    const owners = [nodeA.publicIdentifier, nodeB.publicIdentifier];

    const { address } = ((await nodeA.router.dispatch(
      jsonRpcDeserialize({
        id: Date.now(),
        method: NodeTypes.RpcMethodName.GET_STATE_DEPOSIT_HOLDER_ADDRESS,
        params: { owners },
        jsonrpc: "2.0"
      })
    )) as JsonRpcResponse).result
      .result as NodeTypes.GetStateDepositHolderAddressResult;

    expect(address.length).toBe(42);
  });
});
