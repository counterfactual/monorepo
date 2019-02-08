import { AppInstanceInfo, Node as NodeTypes } from "@counterfactual/types";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { MNEMONIC_PATH } from "../../src/signer";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  getNewMultisig,
  makeInstallProposalRequest,
  TEST_NETWORK
} from "./utils";

describe("Node method follows spec - getAppInstanceDetails", () => {
  jest.setTimeout(15000);

  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeConfig: NodeConfig;
  let provider: BaseProvider;

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

    // @ts-ignore
    provider = new JsonRpcProvider(global.ganacheURL);

    storeServiceA = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    storeServiceA.set([{ key: MNEMONIC_PATH, value: process.env.A_MNEMONIC }]);
    nodeA = await Node.create(
      messagingService,
      storeServiceA,
      nodeConfig,
      provider,
      TEST_NETWORK,
      // @ts-ignore
      global.networkContext
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      nodeConfig,
      provider,
      TEST_NETWORK,
      // @ts-ignore
      global.networkContext
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
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
