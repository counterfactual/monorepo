import { Node as NodeTypes } from "@counterfactual/types";
import { getAddress, hexlify, randomBytes } from "ethers/utils";
import FirebaseServer from "firebase-server";
import { v4 as generateUUID } from "uuid";

import { IStoreService, Node, NodeConfig } from "../../src";
import { ERRORS } from "../../src/methods/errors";
import mockMessagingService from "../services/mock-messaging-service";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  EMPTY_NETWORK,
  generateGetStateRequest,
  getNewMultisig,
  makeInstallProposalRequest
} from "./utils";

describe("Node method follows spec - getAppInstances", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let node: Node;
  let nodeConfig: NodeConfig;

  beforeAll(() => {
    const firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    storeService = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };
  });

  beforeEach(() => {
    node = new Node(
      process.env.A_PRIVATE_KEY!,
      mockMessagingService,
      storeService,
      EMPTY_NETWORK,
      nodeConfig
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("returns the right response for getting the state of a non-existent AppInstance", async () => {
    const getStateReq = generateGetStateRequest(generateUUID());
    expect(
      node.call(NodeTypes.MethodName.GET_STATE, getStateReq)
    ).rejects.toEqual(ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID);
  });

  it("returns the right state for an installed AppInstance", async () => {
    // the peer with whom an installation proposal is being made
    const respondingAddress = getAddress(hexlify(randomBytes(20)));

    const multisigAddress = await getNewMultisig(node, [
      node.address,
      respondingAddress
    ]);
    expect(multisigAddress).toBeDefined();

    const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
      node.address,
      respondingAddress
    );

    const proposalResult = await node.call(
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

    await node.call(installAppInstanceRequest.type, installAppInstanceRequest);

    const getStateReq = generateGetStateRequest(appInstanceId);

    const getStateResult = await node.call(getStateReq.type, getStateReq);
    const state = (getStateResult.result as NodeTypes.GetStateResult).state;
    expect(state).toEqual(
      // @ts-ignore
      appInstanceInstallationProposalRequest.params.initialState
    );
  });
});
