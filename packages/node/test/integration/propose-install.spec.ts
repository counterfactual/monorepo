import { Node as NodeTypes } from "@counterfactual/types";
import FirebaseServer from "firebase-server";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { InstallMessage, NODE_EVENTS, ProposeMessage } from "../../src/types";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  confirmProposedAppInstanceOnNode,
  EMPTY_NETWORK,
  getInstalledAppInstanceInfo,
  getInstalledAppInstances,
  getNewMultisig,
  getProposedAppInstanceInfo,
  makeInstallProposalRequest
} from "./utils";

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
    storeService = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY!
    );
    firebaseServer = firebaseServiceFactory.createServer();
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
      nodeConfig
    );
    nodeB = new Node(
      process.env.B_PRIVATE_KEY!,
      messagingService,
      storeService,
      EMPTY_NETWORK,
      nodeConfig
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it," +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      it("sends proposal with non-null initial state", async done => {
        // A channel is first created between the two nodes
        const multisigAddress = await getNewMultisig(nodeA, [
          nodeA.address,
          nodeB.address
        ]);
        expect(multisigAddress).toBeDefined();
        expect(await getInstalledAppInstances(nodeA)).toEqual([]);
        expect(await getInstalledAppInstances(nodeB)).toEqual([]);

        let appInstanceId;

        // second, an app instance must be proposed to be installed into that channel
        const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
          nodeA.address,
          nodeB.address
        );

        // node B then decides to approve the proposal
        nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
          confirmProposedAppInstanceOnNode(
            appInstanceInstallationProposalRequest.params,
            await getProposedAppInstanceInfo(nodeA, appInstanceId)
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
        });

        nodeA.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
          const appInstanceNodeA = await getInstalledAppInstanceInfo(
            nodeA,
            appInstanceId
          );
          const appInstanceNodeB = await getInstalledAppInstanceInfo(
            nodeB,
            appInstanceId
          );
          expect(appInstanceNodeA).toEqual(appInstanceNodeB);
          done();
        });

        const response = await nodeA.call(
          appInstanceInstallationProposalRequest.type,
          appInstanceInstallationProposalRequest
        );
        appInstanceId = (response.result as NodeTypes.ProposeInstallResult)
          .appInstanceId;
      });

      it("sends proposal with null initial state", async () => {
        const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
          nodeA.address,
          nodeB.address,
          true
        );

        expect(
          nodeA.call(
            appInstanceInstallationProposalRequest.type,
            appInstanceInstallationProposalRequest
          )
        ).rejects.toEqual(ERRORS.NULL_INITIAL_STATE_FOR_PROPOSAL);
      });
    }
  );
});
