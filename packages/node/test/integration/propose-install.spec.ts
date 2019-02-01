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
import { ERRORS } from "../../src/methods/errors";
import { PRIVATE_KEY_PATH } from "../../src/signer";
import { InstallMessage, NODE_EVENTS, ProposeMessage } from "../../src/types";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  confirmProposedAppInstanceOnNode,
  EMPTY_NETWORK,
  getInstalledAppInstanceInfo,
  getInstalledAppInstances,
  getNewMultisig,
  getProposedAppInstanceInfo,
  makeInstallProposalRequest,
  makeInstallRequest
} from "./utils";

describe("Node method follows spec - proposeInstall", () => {
  jest.setTimeout(10000);
  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let firebaseServer: FirebaseServer;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeConfig: NodeConfig;
  let provider: BaseProvider;
  let mvmContract: Contract;
  let proxyFactoryContract: Contract;
  let networkContext: NetworkContext;
  let privateKey: string;

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

    privateKey = new SigningKey(hexlify(randomBytes(32))).privateKey;
    provider = new Web3Provider(
      ganache.provider({
        accounts: [
          {
            balance: "120000000000000000",
            secretKey: privateKey
          }
        ]
      })
    );

    const wallet = new Wallet(privateKey, provider);
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

    storeServiceA = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    storeServiceA.set([{ key: PRIVATE_KEY_PATH, value: privateKey }]);
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
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      networkContext,
      nodeConfig,
      provider
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it," +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      it("sends proposal with null initial state", async () => {
        const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
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
          const installRequest = makeInstallRequest(msg.data.appInstanceId);
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
    }
  );
});
