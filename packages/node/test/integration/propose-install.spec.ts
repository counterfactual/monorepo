import { Node as NodeTypes } from "@counterfactual/common-types";
import cuid from "cuid";
import dotenv from "dotenv";
import FirebaseServer from "firebase-server";

import {
  IMessagingService,
  IStoreService,
  Node,
  NodeConfig,
  NodeMessage
} from "../../src";

import { A_PRIVATE_KEY, B_PRIVATE_KEY } from "../env";

import FirebaseServiceFactory from "./services/firebase-service";
import { makeMultisigRequest, makeProposalRequest, sleep } from "./utils";

dotenv.config();

describe("Node method follows spec - proposeInstall", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let nodeB: Node;
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
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      MULTISIG_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };
  });

  beforeEach(() => {
    nodeA = new Node(A_PRIVATE_KEY, messagingService, storeService, nodeConfig);
    nodeB = new Node(B_PRIVATE_KEY, messagingService, storeService, nodeConfig);
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it(
    "Node A gets app install proposal, sends to node B, B approves it, installs it," +
      "sends acks back to A, A installs it, both nodes have the same app instance",

    async done => {
      // A channel is first created between the two nodes
      const multisigCreationRequest = makeMultisigRequest([
        nodeA.address,
        nodeB.address
      ]);

      nodeA.emit(multisigCreationRequest.type, multisigCreationRequest);

      // Both nodes should have no apps installed
      expect(await nodeA.channels.getAllApps()).toEqual([]);
      expect(await nodeB.channels.getAllApps()).toEqual([]);

      // second, an app instance must be proposed to be installed into that channel
      const appInstanceInstallationProposalRequest = makeProposalRequest(
        nodeB.address
      );

      // node B then decides to approve the propsal
      nodeB.on(NodeTypes.EventName.INSTALL, async (msg: NodeMessage) => {
        if (msg.data.proposal) {
          // FIXME: there shouldn't be a race between locally installing a
          // pending app and wanting to install it immediately upon being
          // notified of it
          await sleep(100);

          // some approval logic happens in this callback, we proceed
          // to approve the proposal, and install the app instance
          const installRequest: NodeTypes.MethodRequest = {
            requestId: cuid(),
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
        // FIXME: there shouldn't be a race between locally installing a
        // pending app and wanting to install it immediately upon being
        // notified of it
        await sleep(100);
        const appInstanceNodeA = (await nodeA.channels.getAllApps())[0];
        const appInstanceNodeB = (await nodeB.channels.getAllApps())[0];
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
