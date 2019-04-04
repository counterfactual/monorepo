import {
  IMessagingService,
  IStoreService,
  MNEMONIC_PATH,
  Node,
  NodeConfig
} from "@counterfactual/node";
import { LocalFirebaseServiceFactory } from "@counterfactual/node/test/services/firebase-server";
import { Node as NodeTypes } from "@counterfactual/types";
import { ethers } from "ethers";
import { JsonRpcProvider } from "ethers/providers";
import { Log, LogLevel } from "logepi";
import { v4 as generateUUID } from "uuid";

import { connectNode } from "../src/bot";

jest.setTimeout(50000);

Log.setOutputLevel(LogLevel.ERROR);

const NETWORK_CONTEXT = global["networkContext"];

describe("playground-server", () => {
  let playgroundNode: Node;
  let nodeAlice: Node;
  let nodeBot: Node;
  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let storeServiceA: IStoreService;
  let storeServiceB: IStoreService;
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
    storeServiceA.set([
      { key: MNEMONIC_PATH, value: global["playgroundMnemonic"] }
    ]);
    playgroundNode = await Node.create(
      messagingService,
      storeServiceA,
      nodeConfig,
      provider,
      global["networkContext"]
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    storeServiceB.set([{ key: MNEMONIC_PATH, value: global["aliceMnemonic"] }]);
    nodeAlice = await Node.create(
      messagingService,
      storeServiceB,
      nodeConfig,
      provider,
      global["networkContext"]
    );

    storeServiceC = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    storeServiceC.set([{ key: MNEMONIC_PATH, value: global["botMnemonic"] }]);
    nodeBot = await Node.create(
      messagingService,
      storeServiceC,
      nodeConfig,
      provider,
      global["networkContext"]
    );

    await nodeAlice.call(NodeTypes.MethodName.CREATE_CHANNEL, {
      params: {
        owners: [nodeAlice.publicIdentifier, playgroundNode.publicIdentifier]
      },
      type: NodeTypes.MethodName.CREATE_CHANNEL,
      requestId: generateUUID()
    });

    await nodeBot.call(NodeTypes.MethodName.CREATE_CHANNEL, {
      params: {
        owners: [nodeBot.publicIdentifier, playgroundNode.publicIdentifier]
      },
      type: NodeTypes.MethodName.CREATE_CHANNEL,
      requestId: generateUUID()
    });
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  describe("connectNode", () => {
    it("wires the node up to automated ttt responses", async done => {
      let appInstanceId;

      await connectNode("tttBot", nodeBot, nodeBot.publicIdentifier);

      nodeAlice.on("installVirtualEvent", message => {
        appInstanceId = message.data.params.appInstanceId;
        nodeAlice.call(NodeTypes.MethodName.TAKE_ACTION, {
          type: NodeTypes.MethodName.TAKE_ACTION,
          requestId: generateUUID(),
          params: {
            appInstanceId,
            action: {
              actionType: 0,
              winClaim: { winClaimType: 0, idx: 0 },
              playX: 1,
              playY: 1
            }
          }
        });
      });

      nodeAlice.on("updateStateEvent", message => {
        if (
          ethers.utils
            .bigNumberify(message.data.newState.turnNum)
            .toNumber() === 2
        ) {
          const { board } = message.data.newState;

          expect(
            board
              .reduce((flattenedBoard, row) => flattenedBoard.concat(row), [])
              .filter(val => ethers.utils.bigNumberify(val).toString() === "1")
              .length
          ).toBe(1);
          expect(
            board
              .reduce((flattenedBoard, row) => flattenedBoard.concat(row), [])
              .filter(val => ethers.utils.bigNumberify(val).toString() === "2")
              .length
          ).toBe(1);
          expect(message.data.appInstanceId).toBe(appInstanceId);

          done();
        }
      });

      nodeAlice.call(NodeTypes.MethodName.PROPOSE_INSTALL_VIRTUAL, {
        type: NodeTypes.MethodName.PROPOSE_INSTALL_VIRTUAL,
        requestId: generateUUID(),
        params: {
          intermediaries: [playgroundNode.publicIdentifier],
          proposedToIdentifier: nodeBot.publicIdentifier,
          initialState: {
            players: [
              ethers.utils.HDNode.fromExtendedKey(
                nodeAlice.publicIdentifier
              ).derivePath("0").address,
              ethers.utils.HDNode.fromExtendedKey(
                nodeBot.publicIdentifier
              ).derivePath("0").address
            ],
            turnNum: 0,
            winner: 0,
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
          },
          appId: NETWORK_CONTEXT["TicTacToe"],
          abiEncodings: {
            actionEncoding:
              "tuple(uint8 actionType, uint256 playX, uint256 playY, tuple(uint8 winClaimType, uint256 idx) winClaim)",
            stateEncoding:
              "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)"
          },
          asset: {
            assetType: 0
          },
          myDeposit: 0,
          peerDeposit: 0,
          timeout: 100
        }
      });
    });
  });
});
