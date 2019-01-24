import { AppInstanceInfo, Node as NodeTypes } from "@counterfactual/types";
import { Provider } from "ethers/providers";
import FirebaseServer from "firebase-server";
import { instance, mock } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  EMPTY_NETWORK,
  getNewMultisig,
  makeInstallProposalRequest
} from "./utils";

describe("Node method follows spec - getAppInstanceDetails", () => {
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

  it("can accept a valid call to get the desired AppInstance details", async done => {
    // first, a channel must be opened for it to have an app instance
    const multisigAddress = await getNewMultisig(nodeA, [
      nodeA.address,
      nodeB.address
    ]);

    expect(multisigAddress).toBeDefined();

    // second, an app instance must be proposed to be installed into that channel
    const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
      nodeB.address
    );

    // third, the pending app instance needs to be installed
    // its installation request will be the callback to the proposal response
    const installAppInstanceRequestId = generateUUID();
    let installedAppInstance: AppInstanceInfo;

    // fourth, a call to get app instances can be made
    // The listeners are setup in reverse order to highlight the callbacks
    // being called in this order as the calls unwind
    // install proposal -> install -> get app instances

    nodeA.on(NodeTypes.MethodName.INSTALL, async res => {
      const installResult: NodeTypes.InstallResult = res.result;
      installedAppInstance = installResult.appInstance;

      const getAppInstancesRequest: NodeTypes.MethodRequest = {
        requestId: generateUUID(),
        type: NodeTypes.MethodName.GET_APP_INSTANCE_DETAILS,
        params: {
          appInstanceId: installedAppInstance.id
        } as NodeTypes.GetAppInstanceDetailsParams
      };

      const response: NodeTypes.MethodResponse = await nodeA.call(
        getAppInstancesRequest.type,
        getAppInstancesRequest
      );
      const appInstanceInfo = (response.result as NodeTypes.GetAppInstanceDetailsResult)
        .appInstance;

      expect(installedAppInstance).toEqual(appInstanceInfo);
      done();
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
