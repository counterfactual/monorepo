import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { BaseProvider, Web3Provider } from "ethers/providers";
import { hexlify, randomBytes, SigningKey } from "ethers/utils";
import FirebaseServer from "firebase-server";
import ganache from "ganache-core";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import { PRIVATE_KEY_PATH } from "../../src/signer";
import {
  InstallVirtualMessage,
  NODE_EVENTS,
  ProposeVirtualMessage
} from "../../src/types";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  confirmProposedVirtualAppInstanceOnNode,
  EMPTY_NETWORK,
  getApps,
  getNewMultisig,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest,
  makeInstallVirtualRequest
} from "./utils";

describe("Node method follows spec - proposeInstallVirtual", () => {
  jest.setTimeout(10000);
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
  let provider: BaseProvider;
  let mvmContract: Contract;
  let proxyFactoryContract: Contract;
  let networkContext: NetworkContext;
  let privateKeyA: string;
  let privateKeyB: string;

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

    privateKeyA = new SigningKey(hexlify(randomBytes(32))).privateKey;
    privateKeyB = new SigningKey(hexlify(randomBytes(32))).privateKey;
    provider = new Web3Provider(
      ganache.provider({
        accounts: [
          {
            balance: "120000000000000000",
            secretKey: privateKeyA
          },
          {
            balance: "120000000000000000",
            secretKey: privateKeyB
          }
        ]
      })
    );

    const wallet = new Wallet(privateKeyA, provider);
    mvmContract = await new ContractFactory(
      MinimumViableMultisig.abi,
      MinimumViableMultisig.bytecode,
      wallet
    ).deploy();
    proxyFactoryContract = await new ContractFactory(
      ProxyFactory.abi,
      ProxyFactory.bytecode,
      wallet
    ).deploy();

    networkContext = EMPTY_NETWORK;
    networkContext.MinimumViableMultisig = mvmContract.address;
    networkContext.ProxyFactory = proxyFactoryContract.address;

    // Setting up a different store service to simulate different store services
    // being used for each Node
    storeServiceA = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    storeServiceA.set([{ key: PRIVATE_KEY_PATH, value: privateKeyA }]);
    nodeA = await Node.create(
      messagingService,
      storeServiceA,
      networkContext,
      nodeConfig,
      provider
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    storeServiceB.set([{ key: PRIVATE_KEY_PATH, value: privateKeyB }]);
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      networkContext,
      nodeConfig,
      provider
    );

    storeServiceC = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeC = await Node.create(
      messagingService,
      storeServiceC,
      networkContext,
      nodeConfig,
      provider
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });
  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. All Nodes confirm receipt of proposal",
    () => {
      it("sends proposal with non-null initial state", async done => {
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
          nodeC.address,
          intermediaries
        );

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
              nodeA.address
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
