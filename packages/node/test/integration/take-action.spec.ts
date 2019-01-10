import {
  AppInstance,
  InstructionExecutor,
  StateChannel
} from "@counterfactual/machine";
import { Address, AssetType, Node as NodeTypes } from "@counterfactual/types";
import dotenv from "dotenv-extended";
import { Contract, ContractFactory, ethers } from "ethers";
import { AddressZero } from "ethers/constants";
import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";
import EventEmitter from "eventemitter3";
import FirebaseServer from "firebase-server";
import ganache from "ganache-core";
import { instance, mock, when } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import TicTacToeApp from "../../../apps/build/TicTacToeApp.json";
import { IMessagingService } from "../../src";
import { RequestHandler } from "../../src/methods/request-handler";
import { Store } from "../../src/store";
import memoryStoreService from "../services/memory-store-service";

import TestFirebaseServiceFactory from "./services/firebase-service";
import { EMPTY_NETWORK } from "./utils";

dotenv.load();

describe("Node method follows spec - proposeInstall", () => {
  let firebaseServer: FirebaseServer;
  let messagingService: IMessagingService;
  let nodeA: RequestHandler;
  let nodeB: RequestHandler;
  let tttContract: Contract;
  let mockedStore: Store;
  let store;
  let mockedStateChannel: StateChannel;
  let stateChannel;
  let provider: ethers.providers.BaseProvider;

  beforeAll(async () => {
    const firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    mockedStore = mock(Store);
    store = instance(mockedStore);

    mockedStateChannel = mock(StateChannel);
    stateChannel = instance(mockedStateChannel);

    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );

    provider = new ethers.providers.Web3Provider(
      ganache.provider({
        accounts: [
          {
            balance: "7fffffffffffffff",
            secretKey: process.env.A_PRIVATE_KEY!
          }
        ]
      })
    );

    nodeA = new RequestHandler(
      new ethers.utils.SigningKey(process.env.A_PRIVATE_KEY!).address,
      new EventEmitter(),
      new EventEmitter(),
      memoryStoreService,
      messagingService,
      new InstructionExecutor(EMPTY_NETWORK),
      EMPTY_NETWORK,
      provider,
      "node-A"
    );

    nodeB = new RequestHandler(
      new ethers.utils.SigningKey(process.env.B_PRIVATE_KEY!).address,
      new EventEmitter(),
      new EventEmitter(),
      memoryStoreService,
      messagingService,
      new InstructionExecutor(EMPTY_NETWORK),
      EMPTY_NETWORK,
      provider,
      "node-B"
    );

    // use mocked store
    nodeA.store = store;
    nodeB.store = store;

    const wallet = new ethers.Wallet(process.env.A_PRIVATE_KEY!, provider);
    tttContract = await new ContractFactory(
      TicTacToeApp.interface,
      TicTacToeApp.bytecode,
      wallet
    ).deploy();
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it.skip("Node A and Node B having installed tic tac toe, Node A takes action, Node B acknowledges state update", async () => {
    const appInstanceId = generateUUID();
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const appInstance = createTTTAppInstance(
      multisigAddress,
      tttContract,
      nodeA.selfAddress,
      nodeB.selfAddress
    );

    when(
      mockedStore.getMultisigAddressFromAppInstanceID(appInstanceId)
    ).thenResolve(multisigAddress);
    console.log(appInstanceId);
    console.log(multisigAddress);

    when(mockedStore.getStateChannel(multisigAddress)).thenResolve(
      stateChannel
    );

    when(mockedStore.getChannelFromAppInstanceID(appInstanceId)).thenResolve(
      stateChannel
    );

    when(
      mockedStore.getAppInstanceIdentityHashFromAppInstanceId(appInstanceId)
    ).thenResolve(appInstance.identityHash);

    when(
      mockedStateChannel.getAppInstance(appInstance.identityHash)
    ).thenReturn(appInstance);

    const takeActionRequest: NodeTypes.MethodRequest = {
      params: {
        appInstanceId,
        action: {
          actionType: 0,
          playX: 0,
          playY: 0,
          winClaim: {
            winClaimType: 0,
            idx: 0
          }
        }
      },
      type: NodeTypes.MethodName.TAKE_ACTION,
      requestId: generateUUID()
    };

    const takeActionResult = await nodeA.callMethod(
      takeActionRequest.type,
      takeActionRequest
    );
    console.log(takeActionResult);
  });
});

function createTTTAppInstance(
  multisigAddress: Address,
  tttContract: Contract,
  initiatorAddress: Address,
  peerAddress: Address
): AppInstance {
  return new AppInstance(
    multisigAddress,
    [initiatorAddress, peerAddress],
    0,
    {
      addr: tttContract.address,
      applyAction: hexlify(randomBytes(4)),
      resolve: hexlify(randomBytes(4)),
      getTurnTaker: hexlify(randomBytes(4)),
      isStateTerminal: hexlify(randomBytes(4)),
      stateEncoding:
        "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)",
      actionEncoding: "tuple(uint8, uint256, uint256, tuple(uint8, uint256))"
    },
    {
      assetType: AssetType.ETH,
      limit: bigNumberify(2),
      token: AddressZero
    },
    false,
    1,
    0,
    {
      players: [initiatorAddress, peerAddress],
      turnNum: 0,
      winner: 0,
      board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    },
    0,
    0
  );
}
