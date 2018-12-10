import {
  AppInstanceInfo,
  Node as NodeTypes
} from "@counterfactual/common-types";
import dotenv from "dotenv";
import { ethers } from "ethers";
import FirebaseServer from "firebase-server";

import { IStoreService, Node, NodeConfig } from "../../src";

import { A_PRIVATE_KEY, B_PRIVATE_KEY } from "../env";

import FirebaseServiceFactory from "../integration/services/firebase-service";
import { MOCK_MESSAGING_SERVICE } from "../mock-services/mock-messaging-service";

dotenv.config();

describe("Node method follows spec - getAppInstances", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let node: Node;
  let nodeConfig: NodeConfig;

  beforeAll(() => {
    const firebaseServiceFactory = new FirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    storeService = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY!
    );
    nodeConfig = {
      MULTISIG_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };
    node = new Node(
      A_PRIVATE_KEY,
      MOCK_MESSAGING_SERVICE,
      storeService,
      nodeConfig
    );
    nodeConfig = {
      MULTISIG_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("can accept a valid call to get empty list of app instances", async done => {
    const requestId = "1";
    const req: NodeTypes.MethodRequest = {
      requestId,
      type: NodeTypes.MethodName.GET_APP_INSTANCES,
      params: {} as NodeTypes.GetAppInstancesParams
    };

    // Set up listener for the method response
    node.on(req.type, (res: NodeTypes.MethodResponse) => {
      expect(req.type).toEqual(res.type);
      expect(res.requestId).toEqual(requestId);
      expect(res.result).toEqual({
        appInstances: [] as AppInstanceInfo[]
      });
      done();
    });

    // Make the method call
    node.emit(req.type, req);
  });

  it("can accept a valid call to get non-empty list of app instances", async done => {
    // first a channel must be opened for it to have an app instance
    const requestId = "2";
    const req: NodeTypes.MethodRequest = {
      requestId,
      type: NodeTypes.MethodName.CREATE_MULTISIG,
      params: {
        owners: [node.address, new ethers.Wallet(B_PRIVATE_KEY).address]
      } as NodeTypes.CreateMultisigParams
    };

    node.on(req.type, res => {
      const createMultisigResult: NodeTypes.CreateMultisigResult = res.result;
      expect(createMultisigResult.multisigAddress).toBeDefined();
      done();
    });

    node.emit(req.type, req);
  });
});
