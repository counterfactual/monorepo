import { AppInstanceInfo, Node as NodeTypes } from "@counterfactual/types";
import { Wallet } from "ethers";
import FirebaseServer from "firebase-server";
import { v4 as generateUUID } from "uuid";

import { IStoreService, Node, NodeConfig } from "../../src";
import mockMessagingService from "../services/mock-messaging-service";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  EMPTY_NETWORK,
  getInstalledAppInstances,
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

  it("can accept a valid call to get empty list of app instances", async () => {
    const appInstances: AppInstanceInfo[] = await getInstalledAppInstances(
      node
    );
    expect(appInstances).toEqual([]);
  });

  it("can accept a valid call to get non-empty list of app instances", async done => {
    // the peer with whom an installation proposal is being made
    const respondingAddress = new Wallet(process.env.B_PRIVATE_KEY!).address;

    // first, a channel must be opened for it to have an app instance
    const multisigAddress = await getNewMultisig(node, [
      node.address,
      respondingAddress
    ]);
    expect(multisigAddress).toBeDefined();

    // second, an app instance must be proposed to be installed into that channel
    const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
      node.address,
      respondingAddress
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
    node.on(getAppInstancesRequest.type, res => {
      expect(getAppInstancesRequest.type).toEqual(res.type);
      expect(res.requestId).toEqual(getAppInstancesRequestId);

      const getAppInstancesResult: NodeTypes.GetAppInstancesResult = res.result;
      expect(getAppInstancesResult.appInstances).toEqual([
        installedAppInstance
      ]);
      done();
    });

    node.on(NodeTypes.MethodName.INSTALL, res => {
      const installResult: NodeTypes.InstallResult = res.result;
      installedAppInstance = installResult.appInstance;
      node.emit(getAppInstancesRequest.type, getAppInstancesRequest);
    });

    node.on(appInstanceInstallationProposalRequest.type, res => {
      const installProposalResult: NodeTypes.ProposeInstallResult = res.result;
      const appInstanceId = installProposalResult.appInstanceId;
      const installAppInstanceRequest: NodeTypes.MethodRequest = {
        requestId: installAppInstanceRequestId,
        type: NodeTypes.MethodName.INSTALL,
        params: {
          appInstanceId
        } as NodeTypes.InstallParams
      };

      node.emit(installAppInstanceRequest.type, installAppInstanceRequest);
    });

    // Make the call to get all apps
    node.emit(
      appInstanceInstallationProposalRequest.type,
      appInstanceInstallationProposalRequest
    );
  });
});
