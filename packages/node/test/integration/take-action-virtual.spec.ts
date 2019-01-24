import TicTacToeApp from "@counterfactual/apps/build/TicTacToeApp.json";
import {
  Address,
  AppABIEncodings,
  AssetType,
  Node as NodeTypes,
  SolidityABIEncoderV2Struct
} from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { AddressZero, One, Zero } from "ethers/constants";
import { BaseProvider, Web3Provider } from "ethers/providers";
import { bigNumberify, hexlify, randomBytes, SigningKey } from "ethers/utils";
import FirebaseServer from "firebase-server";
import ganache from "ganache-core";
import { v4 as generateUUID } from "uuid";

import {
  IMessagingService,
  InstallVirtualMessage,
  IStoreService,
  Node,
  NODE_EVENTS,
  NodeConfig,
  ProposeVirtualMessage,
  TakeActionMessage
} from "../../src";
import { ERRORS } from "../../src/methods/errors";

import TestFirebaseServiceFactory from "./services/firebase-service";
import {
  EMPTY_NETWORK,
  generateGetStateRequest,
  generateTakeActionRequest,
  getNewMultisig,
  makeInstallVirtualRequest
} from "./utils";

describe("Node method follows spec - takeAction", () => {
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
  let tttContract: Contract;
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
            balance: "7fffffffffffffff",
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
  });

  beforeEach(async () => {
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
    firebaseServer.close();
  });

  describe(
    "Node A and C install an AppInstance through Node B, Node A takes action, " +
      "Node C confirms receipt of state update",
    () => {
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

      it("sends takeAction with invalid appInstanceId", async () => {
        const takeActionReq = generateTakeActionRequest("", {
          foo: "bar"
        });

        expect(nodeA.call(takeActionReq.type, takeActionReq)).rejects.toEqual(
          ERRORS.NO_APP_INSTANCE_FOR_TAKE_ACTION
        );
      });

      it("can take action", async done => {
        const validAction = {
          actionType: 0,
          playX: 0,
          playY: 0,
          winClaim: {
            winClaimType: 0,
            idx: 0
          }
        };

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

        const tttAppInstanceProposalReq = makeTTTVirtualAppInstanceProposalReq(
          nodeC.address,
          tttContract.address,
          initialState,
          {
            stateEncoding,
            actionEncoding
          },
          [nodeB.address]
        );

        let newState;

        nodeC.on(NODE_EVENTS.TAKE_ACTION, async (msg: TakeActionMessage) => {
          setTimeout(() => {
            expect(msg.data.params.newState).toEqual(newState);
          }, 2000);

          const getStateReq = generateGetStateRequest(msg.data.appInstanceId);
          const response = await nodeC.call(getStateReq.type, getStateReq);
          const updatedState = (response.result as NodeTypes.GetStateResult)
            .state;
          expect(updatedState).toEqual(newState);
          done();
        });

        nodeA.on(
          NODE_EVENTS.INSTALL_VIRTUAL,
          async (msg: InstallVirtualMessage) => {
            const takeActionReq = generateTakeActionRequest(
              msg.data.params.appInstanceId,
              validAction
            );

            const response = await nodeA.call(
              takeActionReq.type,
              takeActionReq
            );
            newState = (response.result as NodeTypes.TakeActionResult).newState;

            expect(newState.board[0][0]).toEqual(bigNumberify(1));
            expect(newState.turnNum).toEqual(bigNumberify(1));
          }
        );

        nodeC.on(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          (msg: ProposeVirtualMessage) => {
            const installReq = makeInstallVirtualRequest(
              msg.data.appInstanceId,
              msg.data.params.intermediaries
            );
            nodeC.emit(installReq.type, installReq);
          }
        );

        nodeA.emit(tttAppInstanceProposalReq.type, tttAppInstanceProposalReq);
      });
    }
  );
});

function makeTTTVirtualAppInstanceProposalReq(
  respondingAddress: Address,
  appId: Address,
  initialState: SolidityABIEncoderV2Struct,
  abiEncodings: AppABIEncodings,
  intermediaries: Address[]
): NodeTypes.MethodRequest {
  return {
    params: {
      intermediaries,
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
    } as NodeTypes.ProposeInstallVirtualParams,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.PROPOSE_INSTALL_VIRTUAL
  } as NodeTypes.MethodRequest;
}
