import { Node as NodeTypes } from "@counterfactual/types";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { MNEMONIC_PATH } from "../../src/signer";
import { InstallMessage, NODE_EVENTS, ProposeMessage } from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import {
  confirmProposedAppInstanceOnNode,
  getInstalledAppInstanceInfo,
  getInstalledAppInstances,
  getMultisigCreationTransactionHash,
  getProposedAppInstanceInfo,
  makeInstallProposalRequest,
  makeInstallRequest,
  TEST_NETWORK
} from "./utils";

describe("Node method follows spec - proposeInstall", () => {
  jest.setTimeout(15000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeConfig: NodeConfig;
  let provider: BaseProvider;

  beforeAll(async () => {
    firebaseServiceFactory = new LocalFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };

    provider = new JsonRpcProvider(global["ganacheURL"]);

    storeServiceA = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    storeServiceA.set([{ key: MNEMONIC_PATH, value: process.env.A_MNEMONIC }]);
    nodeA = await Node.create(
      messagingService,
      storeServiceA,
      nodeConfig,
      provider,
      TEST_NETWORK,
      global["networkContext"]
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      nodeConfig,
      provider,
      TEST_NETWORK,
      global["networkContext"]
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it," +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      it("sends proposal with non-null initial state", async done => {
        nodeA.on(
          NODE_EVENTS.CREATE_CHANNEL,
          async (data: NodeTypes.CreateChannelResult) => {
            expect(await getInstalledAppInstances(nodeA)).toEqual([]);
            expect(await getInstalledAppInstances(nodeB)).toEqual([]);
            let appInstanceId;

            // second, an app instance must be proposed to be installed into that channel
            const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
              nodeB.publicIdentifier
            );

            // node B then decides to approve the proposal
            nodeB.on(
              NODE_EVENTS.PROPOSE_INSTALL,
              async (msg: ProposeMessage) => {
                confirmProposedAppInstanceOnNode(
                  appInstanceInstallationProposalRequest.params,
                  await getProposedAppInstanceInfo(nodeA, appInstanceId)
                );

                // some approval logic happens in this callback, we proceed
                // to approve the proposal, and install the app instance
                const installRequest = makeInstallRequest(
                  msg.data.appInstanceId
                );
                nodeB.emit(installRequest.type, installRequest);
              }
            );

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
          }
        );
        await getMultisigCreationTransactionHash(nodeA, [
          nodeA.publicIdentifier,
          nodeB.publicIdentifier
        ]);
      });

      it("sends proposal with null initial state", async () => {
        const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
          nodeB.publicIdentifier,
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
