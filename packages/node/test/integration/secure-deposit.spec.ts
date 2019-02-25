import { Node as NodeTypes } from "@counterfactual/types";
import { One } from "ethers/constants";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";
import { v4 as generateUUID } from "uuid";

import {
  DepositConfirmationMessage,
  IMessagingService,
  IStoreService,
  Node,
  NODE_EVENTS,
  NodeConfig
} from "../../src";
import { MNEMONIC_PATH } from "../../src/signer";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import {
  getFreeBalanceState,
  getMultisigCreationTransactionHash,
  makeDepositRequest,
  TEST_NETWORK
} from "./utils";

describe("Node method follows spec - deposit", () => {
  jest.setTimeout(20000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeConfig: NodeConfig;
  let provider: BaseProvider;

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
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  it("has the right balance for both parties after deposits", async () => {
    nodeA.on(
      NODE_EVENTS.CREATE_CHANNEL,
      async (data: NodeTypes.CreateChannelResult) => {
        const { multisigAddress } = data;
        const depositReq = makeDepositRequest(multisigAddress, One);

        nodeB.on(
          NODE_EVENTS.DEPOSIT_CONFIRMED,
          async (msg: DepositConfirmationMessage) => {
            await nodeB.call(depositReq.type, depositReq);
            expect(
              (await provider.getBalance(multisigAddress)).toNumber()
            ).toEqual(2);

            const freeBalanceState = await getFreeBalanceState(
              nodeA,
              multisigAddress
            );
            expect(freeBalanceState.aliceBalance).toEqual(One);
            expect(freeBalanceState.bobBalance).toEqual(One);
          }
        );

        await nodeA.call(depositReq.type, depositReq);
      }
    );
    await getMultisigCreationTransactionHash(nodeA, [
      nodeA.publicIdentifier,
      nodeB.publicIdentifier
    ]);
  });
});
