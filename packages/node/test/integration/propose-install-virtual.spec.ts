import { Node as NodeTypes } from "@counterfactual/types";
import FirebaseServer from "firebase-server";
import { v4 as generateUUID } from "uuid";

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
  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let firebaseServer: FirebaseServer;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeC: Node;
  let storeServiceC: IStoreService;
  let nodeConfig: NodeConfig;

  beforeAll(async () => {
    firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };
  });

  beforeEach(async () => {
    // Setting up a different store service to simulate different store services
    // being used for each Node
    storeServiceA = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeA = await Node.create(
      messagingService,
      storeServiceA,
      EMPTY_NETWORK,
      nodeConfig
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      EMPTY_NETWORK,
      nodeConfig
    );

    storeServiceC = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeC = await Node.create(
      messagingService,
      storeServiceC,
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
