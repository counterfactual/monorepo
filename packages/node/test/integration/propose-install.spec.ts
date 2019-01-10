import { Node as NodeTypes } from "@counterfactual/types";
import dotenv from "dotenv-extended";
import { ethers } from "ethers";
import FirebaseServer from "firebase-server";
import { v4 as generateUUID } from "uuid";

import {
  IMessagingService,
  IStoreService,
  Node,
  NodeConfig,
  NodeMessage
} from "../../src";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  confirmProposedAppInstanceOnNode,
  EMPTY_NETWORK,
  getInstalledAppInstances,
  getNewMultisig,
  getProposedAppInstances,
  makeProposalRequest
} from "./utils";

dotenv.load();

describe("Node method follows spec - proposeInstall", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let nodeB: Node;
  let nodeConfig: NodeConfig;

  beforeAll(async () => {
    const firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    storeService = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY!
    );
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };
  });

  beforeEach(() => {
    nodeA = new Node(
      process.env.A_PRIVATE_KEY!,
      messagingService,
      storeService,
      EMPTY_NETWORK,
      ethers.getDefaultProvider(),
      nodeConfig
    );
    nodeB = new Node(
      process.env.B_PRIVATE_KEY!,
      messagingService,
      storeService,
      EMPTY_NETWORK,
      ethers.getDefaultProvider(),
      nodeConfig
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it(
    "Node A gets app install proposal, sends to node B, B approves it, installs it," +
      "sends acks back to A, A installs it, both nodes have the same app instance",

    async done => {
      // A channel is first created between the two nodes
      const multisigAddress = await getNewMultisig(nodeA, [
        nodeA.address,
        nodeB.address
      ]);
      expect(multisigAddress).toBeDefined();
      expect(await getInstalledAppInstances(nodeA)).toEqual([]);
      expect(await getInstalledAppInstances(nodeB)).toEqual([]);

      // second, an app instance must be proposed to be installed into that channel
      const appInstanceInstallationProposalRequest = makeProposalRequest(
        nodeB.address
      );

      // node B then decides to approve the proposal
      nodeB.on(NodeTypes.EventName.INSTALL, async (msg: NodeMessage) => {
        if (msg.data.proposal) {
          confirmProposedAppInstanceOnNode(
            appInstanceInstallationProposalRequest.params,
            (await getProposedAppInstances(nodeA))[0]
          );

          // some approval logic happens in this callback, we proceed
          // to approve the proposal, and install the app instance
          const installRequest: NodeTypes.MethodRequest = {
            requestId: generateUUID(),
            type: NodeTypes.MethodName.INSTALL,
            params: {
              appInstanceId: msg.data.appInstanceId
            } as NodeTypes.InstallParams
          };

          nodeB.emit(installRequest.type, installRequest);
        } else {
          throw Error("This is expecting a proposal");
        }
      });

      nodeA.on(NodeTypes.EventName.INSTALL, async (msg: NodeMessage) => {
        if (msg.data.proposal) {
          throw Error("This is not expecting proposal");
        }
        const [appInstanceNodeA] = await getInstalledAppInstances(nodeA);
        const [appInstanceNodeB] = await getInstalledAppInstances(nodeB);
        expect(appInstanceNodeA).toEqual(appInstanceNodeB);
        done();
      });

      nodeA.emit(
        appInstanceInstallationProposalRequest.type,
        appInstanceInstallationProposalRequest
      );
    }
  );
});
