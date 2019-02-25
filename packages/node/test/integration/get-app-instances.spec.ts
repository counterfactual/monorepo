import { AppInstanceInfo, Node as NodeTypes } from "@counterfactual/types";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";
import { v4 as generateUUID } from "uuid";

import {
  IMessagingService,
  IStoreService,
  Node,
  NODE_EVENTS,
  NodeConfig
} from "../../src";
import { MNEMONIC_PATH } from "../../src/signer";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import {
  getInstalledAppInstances,
  getMultisigCreationTransactionHash,
  makeInstallProposalRequest,
  TEST_NETWORK
} from "./utils";

describe("Node method follows spec - getAppInstances", () => {
  jest.setTimeout(15000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeConfig: NodeConfig;
  let provider: BaseProvider;

  beforeAll(async () => {
    firebaseServiceFactory = new LocalFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };

    provider = new JsonRpcProvider(global["ganacheURL"]);

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
      global["networkContext"]
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
      global["networkContext"]
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  it("can accept a valid call to get empty list of app instances", async () => {
    const appInstances: AppInstanceInfo[] = await getInstalledAppInstances(
      nodeA
    );
    expect(appInstances).toEqual([]);
  });

  it("can accept a valid call to get non-empty list of app instances", async done => {
    nodeA.on(
      NODE_EVENTS.CREATE_CHANNEL,
      async (data: NodeTypes.CreateChannelResult) => {
        const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
          nodeB.publicIdentifier
        );

        const installAppInstanceRequestId = generateUUID();
        let installedAppInstance: AppInstanceInfo;

        const getAppInstancesRequestId = generateUUID();
        const getAppInstancesRequest: NodeTypes.MethodRequest = {
          requestId: getAppInstancesRequestId,
          type: NodeTypes.MethodName.GET_APP_INSTANCES,
          params: {} as NodeTypes.GetAppInstancesParams
        };

        nodeA.on(getAppInstancesRequest.type, res => {
          expect(getAppInstancesRequest.type).toEqual(res.type);
          expect(res.requestId).toEqual(getAppInstancesRequestId);

          const getAppInstancesResult: NodeTypes.GetAppInstancesResult =
            res.result;
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
          const installProposalResult: NodeTypes.ProposeInstallResult =
            res.result;
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
      }
    );

    await getMultisigCreationTransactionHash(nodeA, [
      nodeA.publicIdentifier,
      nodeB.publicIdentifier
    ]);
  });
});
