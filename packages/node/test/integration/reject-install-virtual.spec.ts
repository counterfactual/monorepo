import { Node as NodeTypes } from "@counterfactual/types";
import { Provider } from "ethers/providers";
import { instance, mock } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import {
  NODE_EVENTS,
  ProposeVirtualMessage,
  RejectProposalMessage
} from "../../src/types";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  confirmProposedVirtualAppInstanceOnNode,
  EMPTY_NETWORK,
  getNewMultisig,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest,
  makeRejectInstallRequest
} from "./utils";

describe("Node method follows spec - rejectInstallVirtual", () => {
  jest.setTimeout(10000);

  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeC: Node;
  let storeServiceC: IStoreService;
  let nodeConfig: NodeConfig;
  let mockProvider: Provider;
  let provider;

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
    mockProvider = mock(Provider);
    provider = instance(mockProvider);

    storeServiceA = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeA = await Node.create(
      messagingService,
      storeServiceA,
      EMPTY_NETWORK,
      nodeConfig,
      provider
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      EMPTY_NETWORK,
      nodeConfig,
      provider
    );

    storeServiceC = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeC = await Node.create(
      messagingService,
      storeServiceC,
      EMPTY_NETWORK,
      nodeConfig,
      provider
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServices();
  });
  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. Node C rejects proposal. Node A confirms rejection",
    () => {
      it("sends proposal with non-null initial state", async done => {
        const multisigAddressAB = await getNewMultisig(nodeA, [
          nodeA.publicIdentifier,
          nodeB.publicIdentifier
        ]);
        expect(multisigAddressAB).toBeDefined();

        const multisigAddressBC = await getNewMultisig(nodeB, [
          nodeB.publicIdentifier,
          nodeC.publicIdentifier
        ]);
        expect(multisigAddressBC).toBeDefined();

        const intermediaries = [nodeB.publicIdentifier];
        const installVirtualAppInstanceProposalRequest = makeInstallVirtualProposalRequest(
          nodeC.publicIdentifier,
          intermediaries
        );

        nodeA.on(
          NODE_EVENTS.REJECT_INSTALL_VIRTUAL,
          async (msg: RejectProposalMessage) => {
            expect((await getProposedAppInstances(nodeA)).length).toEqual(0);
            done();
          }
        );

        nodeC.on(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          async (msg: ProposeVirtualMessage) => {
            const proposedAppInstanceA = (await getProposedAppInstances(
              nodeA
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
              proposedAppInstanceC
            );

            expect(proposedAppInstanceC.initiatingAddress).toEqual(
              nodeA.publicIdentifier
            );
            expect(proposedAppInstanceA.id).toEqual(proposedAppInstanceC.id);

            const rejectReq = makeRejectInstallRequest(msg.data.appInstanceId);

            await nodeC.call(rejectReq.type, rejectReq);

            expect((await getProposedAppInstances(nodeC)).length).toEqual(0);
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
    }
  );
});
