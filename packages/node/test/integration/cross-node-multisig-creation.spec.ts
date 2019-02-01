import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { NetworkContext } from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { BaseProvider, Web3Provider } from "ethers/providers";
import { hexlify, randomBytes, SigningKey } from "ethers/utils";
import FirebaseServer from "firebase-server";
import ganache from "ganache-core";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { PRIVATE_KEY_PATH } from "../../src/signer";

import TestFirebaseServiceFactory from "./services/firebase-service";
import { EMPTY_NETWORK, getChannelAddresses, getNewMultisig } from "./utils";

describe("Node can create multisig, other owners get notified", () => {
  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let firebaseServer: FirebaseServer;
  let messagingService: IMessagingService;
  let nodeA;
  let storeServiceA: IStoreService;
  let nodeB;
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
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
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
  });

  beforeEach(async () => {
    // Setting up a different store service to simulate different store services
    // being used for each Node
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

  it("Node A can create multisig and sync with Node B on new multisig creation", async () => {
    const multisigAddress = await getNewMultisig(nodeA, [
      nodeA.address,
      nodeB.address
    ]);
    const openChannelsNodeA = await getChannelAddresses(nodeA);
    const openChannelsNodeB = await getChannelAddresses(nodeB);
    expect(openChannelsNodeA[0]).toEqual(multisigAddress);
    expect(openChannelsNodeB[0]).toEqual(multisigAddress);
  });
});
