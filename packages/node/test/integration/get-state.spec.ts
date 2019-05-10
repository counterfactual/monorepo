import { Node as NodeTypes } from "@counterfactual/types";
import { v4 as generateUUID } from "uuid";

import { Node } from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import { initialEmptyTTTState } from "./tic-tac-toe";
import {
  createChannel,
  generateGetStateRequest,
  getState,
  installTTTApp,
  makeTTTProposalRequest,
  playerAddresses
} from "./utils";

describe("Node method follows spec - getAppInstances", () => {
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

  it("returns the right response for getting the state of a non-existent AppInstance", async () => {
    const getStateReq = generateGetStateRequest(generateUUID());
    expect(
      nodeA.call(NodeTypes.MethodName.GET_STATE, getStateReq)
    ).rejects.toEqual(ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID);
  });

  it("returns the right state for an installed AppInstance", async () => {
    await createChannel(nodeA, nodeB);
    const params = makeTTTProposalRequest(
      nodeA.publicIdentifier,
      nodeB.publicIdentifier,
      global["networkContext"].TicTacToe
    ).params as NodeTypes.ProposeInstallParams;
    const appInstanceId = await installTTTApp(nodeA, nodeB);
    const state = await getState(nodeA, appInstanceId);

    const initialState = initialEmptyTTTState(playerAddresses([nodeA, nodeB]));
    for (const property in initialState) {
      expect(state[property]).toEqual(params.initialState[property]);
    }
  });
});
