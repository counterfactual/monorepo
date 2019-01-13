import { Node as NodeTypes } from "@counterfactual/types";
import FirebaseServer from "firebase-server";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  confirmProposedVirtualAppInstanceOnNode,
  EMPTY_NETWORK,
  getNewMultisig,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest
} from "./utils";
import { NODE_EVENTS, ProposeVirtualMessage } from "../../src/types";

describe("Node method follows spec - proposeInstallVirtual", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let intermediaryNode: Node;
  let nodeC: Node;
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
      nodeConfig
    );
    intermediaryNode = new Node(
      process.env.B_PRIVATE_KEY!,
      messagingService,
      storeService,
      EMPTY_NETWORK,
      nodeConfig
    );
    nodeC = new Node(
      process.env.C_PRIVATE_KEY!,
      messagingService,
      storeService,
      EMPTY_NETWORK,
      nodeConfig
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("Node A makes a proposal to install a Virtual AppInstance to Node C, both nodes confirm receipt of proposal", async done => {
    const multisigAddress = await getNewMultisig(nodeA, [
      nodeA.address,
      nodeC.address
    ]);
    expect(multisigAddress).toBeDefined();

    const intermediaries = [intermediaryNode.address];
    const installVirtualAppInstanceProposalRequest = makeInstallVirtualProposalRequest(
      nodeC.address,
      intermediaries
    );

    nodeC.on(
      NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
      async (msg: ProposeVirtualMessage) => {
        confirmProposedVirtualAppInstanceOnNode(
          installVirtualAppInstanceProposalRequest.params,
          (await getProposedAppInstances(nodeA))[0]
        );
        confirmProposedVirtualAppInstanceOnNode(
          installVirtualAppInstanceProposalRequest.params,
          (await getProposedAppInstances(nodeC))[0]
        );
        done();
      }
    );

    const response = await nodeA.call(
      installVirtualAppInstanceProposalRequest.type,
      installVirtualAppInstanceProposalRequest
    );
    const appInstanceId = (response.result as NodeTypes.ProposeInstallVirtualResult)
      .appInstanceId;
    expect(appInstanceId).toBeDefined();
  });
});
