import { Node as NodeTypes } from "@counterfactual/types";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { MNEMONIC_PATH } from "../../src/signer";
import {
  NODE_EVENTS,
  ProposeVirtualMessage,
  RejectProposalMessage
} from "../../src/types";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  confirmProposedVirtualAppInstanceOnNode,
  getMultisigCreationTransactionHash,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest,
  makeRejectInstallRequest,
  TEST_NETWORK
} from "./utils";

describe("Node method follows spec - rejectInstallVirtual", () => {
  jest.setTimeout(20000);

  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeC: Node;
  let storeServiceC: IStoreService;
  let nodeConfig: NodeConfig;
  let provider: BaseProvider;

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
    storeServiceB.set([{ key: MNEMONIC_PATH, value: process.env.B_MNEMONIC }]);
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      nodeConfig,
      provider,
      TEST_NETWORK,
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
      TEST_NETWORK,
      global["networkContext"]
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });
  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. Node C rejects proposal. Node A confirms rejection",
    () => {
      it("sends proposal with non-null initial state", async done => {
        nodeA.on(
          NODE_EVENTS.CREATE_CHANNEL,
          async (data: NodeTypes.CreateChannelResult) => {
            nodeC.on(
              NODE_EVENTS.CREATE_CHANNEL,
              async (data: NodeTypes.CreateChannelResult) => {
                const intermediaries = [nodeB.publicIdentifier];
                const installVirtualAppInstanceProposalRequest = makeInstallVirtualProposalRequest(
                  nodeC.publicIdentifier,
                  intermediaries
                );

                nodeA.on(
                  NODE_EVENTS.REJECT_INSTALL_VIRTUAL,
                  async (msg: RejectProposalMessage) => {
                    expect(
                      (await getProposedAppInstances(nodeA)).length
                    ).toEqual(0);
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

                    expect(proposedAppInstanceC.proposedByIdentifier).toEqual(
                      nodeA.publicIdentifier
                    );
                    expect(proposedAppInstanceA.id).toEqual(
                      proposedAppInstanceC.id
                    );

                    const rejectReq = makeRejectInstallRequest(
                      msg.data.appInstanceId
                    );

                    await nodeC.call(rejectReq.type, rejectReq);

                    expect(
                      (await getProposedAppInstances(nodeC)).length
                    ).toEqual(0);
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
