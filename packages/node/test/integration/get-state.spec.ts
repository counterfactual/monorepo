import { Node as NodeTypes } from "@counterfactual/types";
import { Provider } from "ethers/providers";
import FirebaseServer from "firebase-server";
import { instance, mock } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { ERRORS } from "../../src/methods/errors";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  EMPTY_NETWORK,
  generateGetStateRequest,
  getNewMultisig,
  makeInstallProposalRequest
} from "./utils";

describe("Node method follows spec - getAppInstances", () => {
  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let firebaseServer: FirebaseServer;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeConfig: NodeConfig;
  let mockProvider: Provider;
  let provider;

  beforeAll(() => {
    firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };
    mockProvider = mock(Provider);
    provider = instance(mockProvider);
  });

  beforeEach(async () => {
    storeServiceA = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeA = await Node.create(
      messagingService,
      storeServiceA,
      EMPTY_NETWORK,
      nodeConfig,
      provider
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      EMPTY_NETWORK,
      nodeConfig,
      provider
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("returns the right response for getting the state of a non-existent AppInstance", async () => {
    const getStateReq = generateGetStateRequest(generateUUID());
    expect(
      nodeA.call(NodeTypes.MethodName.GET_STATE, getStateReq)
    ).rejects.toEqual(ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID);
  });

  it("returns the right state for an installed AppInstance", async () => {
    const multisigAddress = await getNewMultisig(nodeA, [
      nodeA.address,
      nodeB.address
    ]);
    expect(multisigAddress).toBeDefined();

    const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
      nodeB.address
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

    await nodeA.call(installAppInstanceRequest.type, installAppInstanceRequest);

    const getStateReq = generateGetStateRequest(appInstanceId);

    const getStateResult = await nodeA.call(getStateReq.type, getStateReq);
    const state = (getStateResult.result as NodeTypes.GetStateResult).state;
    expect(state.foo).toEqual(
      (appInstanceInstallationProposalRequest.params as NodeTypes.ProposeInstallParams)
        .initialState.foo
    );
    expect(state.bar).toEqual(
      (appInstanceInstallationProposalRequest.params as NodeTypes.ProposeInstallParams)
        .initialState.bar
    );
  });
});
