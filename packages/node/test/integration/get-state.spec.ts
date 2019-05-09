import { Node as NodeTypes } from "@counterfactual/types";
import { v4 as generateUUID } from "uuid";

import { Node, NODE_EVENTS } from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  generateGetStateRequest,
  getMultisigCreationTransactionHash,
  makeInstallProposalRequest
} from "./utils";

describe("Node method follows spec - getAppInstances", () => {
  jest.setTimeout(15000);

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

  it("returns the right state for an installed AppInstance", async done => {
    nodeA.on(NODE_EVENTS.CREATE_CHANNEL, async () => {
      const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
        nodeB.publicIdentifier
      );

      const proposalResult = await nodeA.call(
        appInstanceInstallationProposalRequest.type,
        appInstanceInstallationProposalRequest
      );
      const appInstanceId = (proposalResult.result as NodeTypes.ProposeInstallResult)
        .appInstanceId;

      const installAppInstanceRequest: NodeTypes.MethodRequest = {
        requestId: generateUUID(),
        type: NodeTypes.MethodName.INSTALL,
        params: {
          appInstanceId
        } as NodeTypes.InstallParams
      };

      await nodeA.call(
        installAppInstanceRequest.type,
        installAppInstanceRequest
      );

      const getStateReq = generateGetStateRequest(appInstanceId);

      const getStateResult = await nodeA.call(getStateReq.type, getStateReq);
      const state = (getStateResult.result as NodeTypes.GetStateResult).state;
      expect(state["foo"]).toEqual(
        (appInstanceInstallationProposalRequest.params as NodeTypes.ProposeInstallParams)
          .initialState["foo"]
      );
      expect(state["bar"]).toEqual(
        (appInstanceInstallationProposalRequest.params as NodeTypes.ProposeInstallParams)
          .initialState["bar"]
      );
      done();
    });

    await getMultisigCreationTransactionHash(nodeA, [
      nodeA.publicIdentifier,
      nodeB.publicIdentifier
    ]);
  });
});
