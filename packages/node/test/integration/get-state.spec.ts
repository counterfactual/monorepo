import { NetworkContextForTestSuite } from "@counterfactual/chain/src/contract-deployments.jest";
import { Node as NodeTypes } from "@counterfactual/types";
import { v4 as generateUUID } from "uuid";

import { NO_MULTISIG_FOR_APP_INSTANCE_ID, Node } from "../../src";

import { setup, SetupContext } from "./setup";
import { initialEmptyTTTState } from "./tic-tac-toe";
import {
  Apps,
  createChannel,
  generateGetStateRequest,
  getState,
  installApp,
  makeTTTProposalRequest
} from "./utils";

describe("Node method follows spec - getAppInstances", () => {
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
  });

  it("returns the right response for getting the state of a non-existent AppInstance", async () => {
    const getStateReq = generateGetStateRequest(generateUUID());
    await expect(nodeA.rpcRouter.dispatch(getStateReq)).rejects.toThrowError(
      NO_MULTISIG_FOR_APP_INSTANCE_ID
    );
  });

  it("returns the right state for an installed AppInstance", async () => {
    await createChannel(nodeA, nodeB);
    const params = makeTTTProposalRequest(
      nodeB.publicIdentifier,
      (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
    ).parameters as NodeTypes.ProposeInstallParams;
    const appInstanceId = await installApp(nodeA, nodeB, Apps.TicTacToe);
    const state = await getState(nodeA, appInstanceId);

    const initialState = initialEmptyTTTState();
    for (const property in initialState) {
      expect(state[property]).toEqual(params.initialState[property]);
    }
  });
});
