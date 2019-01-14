import { Node as NodeTypes } from "@counterfactual/types";
import FirebaseServer from "firebase-server";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { NODE_EVENTS, ProposeVirtualMessage } from "../../src/types";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  confirmProposedVirtualAppInstanceOnNode,
  EMPTY_NETWORK,
  getNewMultisig,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest
} from "./utils";

describe("Node method follows spec - proposeInstallVirtual", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let nodeB: Node;
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
    nodeB = new Node(
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

  it(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. All Nodes confirm receipt of proposal",
    async done => {
      const multisigAddressAB = await getNewMultisig(nodeA, [
        nodeA.address,
        nodeB.address
      ]);
      expect(multisigAddressAB).toBeDefined();

      const multisigAddressBC = await getNewMultisig(nodeB, [
        nodeB.address,
        nodeC.address
      ]);
      expect(multisigAddressBC).toBeDefined();

      const intermediaries = [nodeB.address];
      const installVirtualAppInstanceProposalRequest = makeInstallVirtualProposalRequest(
        nodeA.address,
        nodeC.address,
        intermediaries
      );

      nodeC.on(
        NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
        async (msg: ProposeVirtualMessage) => {
          const proposedAppInstanceA = (await getProposedAppInstances(
            nodeA
          ))[0];
          const proposedAppInstanceB = (await getProposedAppInstances(
            nodeB
          ))[0];
          const proposedAppInstanceC = (await getProposedAppInstances(
            nodeC
          ))[0];

          confirmProposedVirtualAppInstanceOnNode(
            installVirtualAppInstanceProposalRequest.params,
            proposedAppInstanceA
          );
          confirmProposedVirtualAppInstanceOnNode(
            installVirtualAppInstanceProposalRequest.params,
            proposedAppInstanceB
          );
          confirmProposedVirtualAppInstanceOnNode(
            installVirtualAppInstanceProposalRequest.params,
            proposedAppInstanceC
          );

          expect(proposedAppInstanceC.initiatingAddress).toEqual(nodeA.address);
          expect(proposedAppInstanceA.id).toEqual(proposedAppInstanceB.id);
          expect(proposedAppInstanceB.id).toEqual(proposedAppInstanceC.id);
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
    }
  );
});
