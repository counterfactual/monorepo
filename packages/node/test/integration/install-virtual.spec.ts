import { Node as NodeTypes } from "@counterfactual/types";
import { JsonRpcProvider } from "ethers/providers";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import { MNEMONIC_PATH } from "../../src/signer";
import {
  InstallVirtualMessage,
  NODE_EVENTS,
  ProposeVirtualMessage
} from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";
import { A_MNEMONIC, B_MNEMONIC } from "../test-constants.jest";

import {
  confirmProposedVirtualAppInstanceOnNode,
  getApps,
  getMultisigCreationTransactionHash,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest,
  makeInstallVirtualRequest
} from "./utils";

describe("Node method follows spec - proposeInstallVirtual", () => {
  jest.setTimeout(35000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeC: Node;
  let storeServiceC: IStoreService;
  let nodeConfig: NodeConfig;
  let provider: JsonRpcProvider;

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
    storeServiceA.set([{ key: MNEMONIC_PATH, value: A_MNEMONIC }]);
    nodeA = await Node.create(
      messagingService,
      storeServiceA,
      nodeConfig,
      provider,
      global["networkContext"]
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    storeServiceB.set([{ key: MNEMONIC_PATH, value: B_MNEMONIC }]);
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      nodeConfig,
      provider,
      global["networkContext"]
    );

    storeServiceC = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeC = await Node.create(
      messagingService,
      storeServiceC,
      nodeConfig,
      provider,
      global["networkContext"]
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });
  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. All Nodes confirm receipt of proposal",
    () => {
      it("sends proposal with non-null initial state", async done => {
        nodeA.once(
          NODE_EVENTS.CREATE_CHANNEL,
          async (data: NodeTypes.CreateChannelResult) => {
            nodeC.once(
              NODE_EVENTS.CREATE_CHANNEL,
              async (data: NodeTypes.CreateChannelResult) => {
                const intermediaries = [nodeB.publicIdentifier];
                const installVirtualAppInstanceProposalRequest = makeInstallVirtualProposalRequest(
                  nodeC.publicIdentifier,
                  intermediaries
                );

                nodeA.once(
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

                    expect(virtualAppInstanceNodeA).toEqual(
                      virtualAppInstanceNodeC
                    );
                    done();
                  }
                );

                nodeC.once(
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

                    expect(proposedAppInstanceC.proposedByIdentifier).toEqual(
                      nodeA.publicIdentifier
                    );
                    expect(proposedAppInstanceA.id).toEqual(
                      proposedAppInstanceC.id
                    );

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
              }
            );
            await getMultisigCreationTransactionHash(nodeB, [
              nodeB.publicIdentifier,
              nodeC.publicIdentifier
            ]);
          }
        );
        await getMultisigCreationTransactionHash(nodeA, [
          nodeA.publicIdentifier,
          nodeB.publicIdentifier
        ]);
      });
    }
  );
});
