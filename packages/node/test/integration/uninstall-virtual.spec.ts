import { Node as NodeTypes } from "@counterfactual/types";
import { Provider } from "ethers/providers";
import { instance, mock } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import {
  InstallVirtualMessage,
  NODE_EVENTS,
  ProposeVirtualMessage,
  UninstallMessage
} from "../../src/types";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  confirmProposedVirtualAppInstanceOnNode,
  EMPTY_NETWORK,
  generateUninstallRequest,
  getApps,
  getNewMultisig,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest,
  makeInstallVirtualRequest
} from "./utils";

describe("Node method follows spec - uninstall", () => {
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
    firebaseServiceFactory.closeServiceConnections();
  });
  describe(
    "Node A and C install a Virtual AppInstance through an intermediary Node B," +
      "then Node A uninstalls the installed AppInstance",
    () => {
      it("sends uninstall ", async done => {
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

        nodeC.on(NODE_EVENTS.UNINSTALL, async (msg: UninstallMessage) => {
          expect(await getApps(nodeA, APP_INSTANCE_STATUS.INSTALLED)).toEqual(
            []
          );
          expect(await getApps(nodeC, APP_INSTANCE_STATUS.INSTALLED)).toEqual(
            []
          );
          done();
        });

        nodeA.on(
          NODE_EVENTS.INSTALL_VIRTUAL,
          async (msg: InstallVirtualMessage) => {
            const virtualAppInstanceNodeA = (await getApps(
              nodeA,
              APP_INSTANCE_STATUS.INSTALLED
            ))[0];
            const virtualAppInstanceNodeC = (await getApps(
              nodeC,
              APP_INSTANCE_STATUS.INSTALLED
            ))[0];

            expect(virtualAppInstanceNodeA).toEqual(virtualAppInstanceNodeC);

            const uninstallReq = generateUninstallRequest(
              msg.data.params.appInstanceId
            );
            nodeA.emit(uninstallReq.type, uninstallReq);
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

            const installVirtualReq = makeInstallVirtualRequest(
              msg.data.appInstanceId,
              msg.data.params.intermediaries
            );
            nodeC.emit(installVirtualReq.type, installVirtualReq);
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
