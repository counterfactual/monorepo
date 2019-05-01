import {
  Address,
  AppABIEncodings,
  AssetType,
  Node as NodeTypes,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { AddressZero, One, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
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
import { MNEMONIC_PATH } from "../../src/signer";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";
import { A_MNEMONIC } from "../test-constants.jest";

import {
  generateTakeActionRequest,
  getMultisigCreationTransactionHash,
  makeInstallRequest
} from "./utils";

describe("Node method follows spec - fails with improper action taken", () => {
  jest.setTimeout(20000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
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
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      nodeConfig,
      provider,
      global["networkContext"]
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
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

      nodeA.on(
        NODE_EVENTS.CREATE_CHANNEL,
        async (data: NodeTypes.CreateChannelResult) => {
          const tttAppInstanceProposalReq = makeTTTAppInstanceProposalReq(
            nodeB.publicIdentifier,
            global["networkContext"].TicTacToe,
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
              expect(e.toString()).toMatch(ERRORS.INVALID_ACTION);
              done();
            }
          });

          nodeB.on(
            NodeTypes.EventName.PROPOSE_INSTALL,
            (msg: ProposeMessage) => {
              const installReq = makeInstallRequest(msg.data.appInstanceId);
              nodeB.emit(installReq.type, installReq);
            }
          );

          nodeA.emit(tttAppInstanceProposalReq.type, tttAppInstanceProposalReq);
        }
      );
      await getMultisigCreationTransactionHash(nodeA, [
        nodeA.publicIdentifier,
        nodeB.publicIdentifier
      ]);
    });
  });
});

function makeTTTAppInstanceProposalReq(
  proposedToIdentifier: string,
  appId: Address,
  initialState: SolidityABIEncoderV2Type,
  abiEncodings: AppABIEncodings
): NodeTypes.MethodRequest {
  return {
    params: {
      proposedToIdentifier,
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
