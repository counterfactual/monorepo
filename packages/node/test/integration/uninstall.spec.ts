import { JsonRpcProvider } from "ethers/providers";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import { xkeyKthAddress } from "../../src/machine";
import { MNEMONIC_PATH } from "../../src/signer";
import { NODE_EVENTS, UninstallMessage } from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";
import { A_MNEMONIC } from "../test-constants.jest";

import {
  createChannel,
  generateUninstallRequest,
  getApps,
  installTTTApp
} from "./utils";

describe("Node method follows spec - uninstall", () => {
  jest.setTimeout(50000);

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

  describe("Node A and B install TTT, then uninstall it", () => {
    it("sends proposal with non-null initial state", async done => {
      const initialState = {
        players: [
          xkeyKthAddress(nodeA.publicIdentifier, 0), // <-- winner
          xkeyKthAddress(nodeB.publicIdentifier, 0)
        ],
        turnNum: 0,
        winner: 1, // Hard-coded winner for test
        board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
      };

      await createChannel(nodeA, nodeB);
      const appInstanceId = await installTTTApp(nodeA, nodeB, initialState);
      const uninstallReq = generateUninstallRequest(appInstanceId);

      nodeA.emit(uninstallReq.type, uninstallReq);
      nodeB.on(NODE_EVENTS.UNINSTALL, async (msg: UninstallMessage) => {
        expect(await getApps(nodeA, APP_INSTANCE_STATUS.INSTALLED)).toEqual([]);
        expect(await getApps(nodeB, APP_INSTANCE_STATUS.INSTALLED)).toEqual([]);
        done();
      });
    });
  });
});
