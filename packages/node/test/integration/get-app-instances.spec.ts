import { AppInstanceInfo, Node as NodeTypes } from "@counterfactual/types";
import { Provider } from "ethers/providers";
import { instance, mock } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  EMPTY_NETWORK,
  getInstalledAppInstances,
  getNewMultisig,
  makeInstallProposalRequest
} from "./utils";

describe("Node method follows spec - getAppInstances", () => {
  jest.setTimeout(10000);

  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeConfig: NodeConfig;
  let mockProvider: Provider;
  let provider;

  beforeAll(async () => {
    firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };
    mockProvider = mock(Provider);
    provider = instance(mockProvider);

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
    firebaseServiceFactory.closeServices();
  });

  it("can accept a valid call to get empty list of app instances", async () => {
    const appInstances: AppInstanceInfo[] = await getInstalledAppInstances(
      nodeA
    );
    expect(appInstances).toEqual([]);
  });

  it("can accept a valid call to get non-empty list of app instances", async done => {
    // first, a channel must be opened for it to have an app instance
    const multisigAddress = await getNewMultisig(nodeA, [
      nodeA.publicIdentifier,
      nodeB.publicIdentifier
    ]);

    expect(multisigAddress).toBeDefined();

    // second, an app instance must be proposed to be installed into that channel
    const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
      nodeB.publicIdentifier
    );

    // third, the pending app instance needs to be installed
    // its installation request will be the callback to the proposal response
    const installAppInstanceRequestId = generateUUID();
    let installedAppInstance: AppInstanceInfo;

    // fourth, a call to get app instances can be made
    const getAppInstancesRequestId = generateUUID();
    const getAppInstancesRequest: NodeTypes.MethodRequest = {
      requestId: getAppInstancesRequestId,
      type: NodeTypes.MethodName.GET_APP_INSTANCES,
      params: {} as NodeTypes.GetAppInstancesParams
    };

    // The listeners are setup in reverse order to highlight the callbacks
    // being called in this order as the calls unwind
    // install proposal -> install -> get app instances

    // Set up listener for getting the app that's supposed to be installed
    nodeA.on(getAppInstancesRequest.type, res => {
      expect(getAppInstancesRequest.type).toEqual(res.type);
      expect(res.requestId).toEqual(getAppInstancesRequestId);

      const getAppInstancesResult: NodeTypes.GetAppInstancesResult = res.result;
      expect(getAppInstancesResult.appInstances).toEqual([
        installedAppInstance
      ]);
      done();
    });

    nodeA.on(NodeTypes.MethodName.INSTALL, res => {
      const installResult: NodeTypes.InstallResult = res.result;
      installedAppInstance = installResult.appInstance;
      nodeA.emit(getAppInstancesRequest.type, getAppInstancesRequest);
    });

    nodeA.on(appInstanceInstallationProposalRequest.type, res => {
      const installProposalResult: NodeTypes.ProposeInstallResult = res.result;
      const appInstanceId = installProposalResult.appInstanceId;
      const installAppInstanceRequest: NodeTypes.MethodRequest = {
        requestId: installAppInstanceRequestId,
        type: NodeTypes.MethodName.INSTALL,
        params: {
          appInstanceId
        } as NodeTypes.InstallParams
      };

      nodeA.emit(installAppInstanceRequest.type, installAppInstanceRequest);
    });

    // Make the call to get all apps
    nodeA.emit(
      appInstanceInstallationProposalRequest.type,
      appInstanceInstallationProposalRequest
    );
  });
});
