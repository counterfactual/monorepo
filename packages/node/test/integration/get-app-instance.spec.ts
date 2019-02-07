import { AppInstanceInfo, Node as NodeTypes } from "@counterfactual/types";
import { Provider } from "ethers/providers";
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

  it("can accept a valid call to get the desired AppInstance details", async done => {
    const multisigAddress = await getNewMultisig(nodeA, [
      nodeA.publicIdentifier,
      nodeB.publicIdentifier
    ]);

    expect(multisigAddress).toBeDefined();

    const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
      nodeB.publicIdentifier
    );

    const installAppInstanceRequestId = generateUUID();
    let installedAppInstance: AppInstanceInfo;

    nodeA.on(NodeTypes.MethodName.INSTALL, async res => {
      const installResult: NodeTypes.InstallResult = res.result;
      installedAppInstance = installResult.appInstance;

      // now we check to validate for correct AppInstance retrieval
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

    nodeA.emit(
      appInstanceInstallationProposalRequest.type,
      appInstanceInstallationProposalRequest
    );
  });
});
