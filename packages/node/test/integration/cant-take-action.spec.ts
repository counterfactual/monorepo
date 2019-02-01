import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import {
  Address,
  AppABIEncodings,
  AssetType,
  NetworkContext,
  Node as NodeTypes,
  SolidityABIEncoderV2Struct
} from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { AddressZero, One, Zero } from "ethers/constants";
import { BaseProvider, Web3Provider } from "ethers/providers";
import { hexlify, randomBytes, SigningKey } from "ethers/utils";
import FirebaseServer from "firebase-server";
import ganache from "ganache-core";
import { v4 as generateUUID } from "uuid";

import {
  IMessagingService,
  InstallMessage,
  IStoreService,
  Node,
  NODE_EVENTS,
  NodeConfig,
  ProposeMessage
} from "../../src";
import { ERRORS } from "../../src/methods/errors";
import { PRIVATE_KEY_PATH } from "../../src/signer";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  EMPTY_NETWORK,
  generateTakeActionRequest,
  getNewMultisig,
  makeInstallRequest
} from "./utils";

describe("Node method follows spec - takeAction", () => {
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
  let tttContract: Contract;
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
    tttContract = await new ContractFactory(
      TicTacToeApp.interface,
      TicTacToeApp.bytecode,
      wallet
    ).deploy();
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

  describe("Node A and B install an AppInstance, Node A takes invalid action", () => {
    const stateEncoding =
      "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)";
    const actionEncoding =
      "tuple(uint8 actionType, uint256 playX, uint256 playY, tuple(uint8 winClaimType, uint256 idx) winClaim)";

    const initialState = {
      players: [AddressZero, AddressZero],
      turnNum: 0,
      winner: 0,
      board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    };

    it("can't take invalid action", async done => {
      const validAction = {
        actionType: 1,
        playX: 0,
        playY: 0,
        winClaim: {
          winClaimType: 0,
          idx: 0
        }
      };

      const multisigAddress = await getNewMultisig(nodeA, [
        nodeA.address,
        nodeB.address
      ]);
      expect(multisigAddress).toBeDefined();

      const tttAppInstanceProposalReq = makeTTTAppInstanceProposalReq(
        nodeB.address,
        tttContract.address,
        initialState,
        {
          stateEncoding,
          actionEncoding
        }
      );

      nodeA.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
        const takeActionReq = generateTakeActionRequest(
          msg.data.params.appInstanceId,
          validAction
        );

        try {
          await nodeA.call(takeActionReq.type, takeActionReq);
        } catch (e) {
          expect(e.toString().includes(ERRORS.INVALID_ACTION)).toBeTruthy();
          done();
        }
      });

      nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, (msg: ProposeMessage) => {
        const installReq = makeInstallRequest(msg.data.appInstanceId);
        nodeB.emit(installReq.type, installReq);
      });

      nodeA.emit(tttAppInstanceProposalReq.type, tttAppInstanceProposalReq);
    });
  });
});

function makeTTTAppInstanceProposalReq(
  respondingAddress: Address,
  appId: Address,
  initialState: SolidityABIEncoderV2Struct,
  abiEncodings: AppABIEncodings
): NodeTypes.MethodRequest {
  return {
    params: {
      respondingAddress,
      appId,
      initialState,
      abiEncodings,
      asset: {
        assetType: AssetType.ETH
      },
      myDeposit: Zero,
      peerDeposit: Zero,
      timeout: One
    },
    requestId: generateUUID(),
    type: NodeTypes.MethodName.PROPOSE_INSTALL
  } as NodeTypes.MethodRequest;
}
