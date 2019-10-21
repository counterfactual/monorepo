import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber } from "ethers/utils";
import log from "loglevel";

import { generatePrivateKeyGeneratorAndXPubPair, Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { NODE_EVENTS, ProposeMessage } from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";
import MemoryLockService from "../services/memory-lock-service";
import { MemoryMessagingService } from "../services/memory-messaging-service";
import { MemoryStoreServiceFactory } from "../services/memory-store-service";
import {
  A_EXTENDED_PRIVATE_KEY,
  B_EXTENDED_PRIVATE_KEY
} from "../test-constants.jest";

import {
  collateralizeChannel,
  createChannel,
  getBalances,
  getInstalledAppInstances,
  makeInstallCall,
  makeProposeCall
} from "./utils";

expect.extend({ toBeLt });

log.disableAll();

describe("Uses a provided signing key generation function to sign channel state updates", () => {
  let multisigAddress: string;
  jest.setTimeout(10000);
  let nodeA: Node;
  let nodeB: Node;

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it, " +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      beforeEach(async () => {
        const provider = new JsonRpcProvider(global["ganacheURL"]);
        const messagingService = new MemoryMessagingService();
        const nodeConfig = {
          STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
        };

        const lockService = new MemoryLockService();

        const storeServiceA = new MemoryStoreServiceFactory().createStoreService();
        const [
          privateKeyGeneratorA,
          xpubA
        ] = generatePrivateKeyGeneratorAndXPubPair(A_EXTENDED_PRIVATE_KEY);
        nodeA = await Node.create(
          messagingService,
          storeServiceA,
          global["networkContext"],
          nodeConfig,
          provider,
          lockService,
          xpubA,
          privateKeyGeneratorA
        );

        const storeServiceB = new MemoryStoreServiceFactory().createStoreService();
        const [
          privateKeyGeneratorB,
          xpubB
        ] = generatePrivateKeyGeneratorAndXPubPair(B_EXTENDED_PRIVATE_KEY);
        nodeB = await Node.create(
          messagingService,
          storeServiceB,
          global["networkContext"],
          nodeConfig,
          provider,
          lockService,
          xpubB,
          privateKeyGeneratorB
        );

        multisigAddress = await createChannel(nodeA, nodeB);
      });

      it("install app with ETH", async done => {
        await collateralizeChannel(multisigAddress, nodeA, nodeB);

        let preInstallETHBalanceNodeA: BigNumber;
        let postInstallETHBalanceNodeA: BigNumber;
        let preInstallETHBalanceNodeB: BigNumber;
        let postInstallETHBalanceNodeB: BigNumber;

        nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
          [
            preInstallETHBalanceNodeA,
            preInstallETHBalanceNodeB
          ] = await getBalances(
            nodeA,
            nodeB,
            multisigAddress,
            CONVENTION_FOR_ETH_TOKEN_ADDRESS
          );
          makeInstallCall(nodeB, msg.data.appInstanceId);
        });

        nodeA.on(NODE_EVENTS.INSTALL, async () => {
          const [appInstanceNodeA] = await getInstalledAppInstances(nodeA);
          const [appInstanceNodeB] = await getInstalledAppInstances(nodeB);
          expect(appInstanceNodeA).toBeDefined();
          expect(appInstanceNodeA).toEqual(appInstanceNodeB);

          [
            postInstallETHBalanceNodeA,
            postInstallETHBalanceNodeB
          ] = await getBalances(
            nodeA,
            nodeB,
            multisigAddress,
            CONVENTION_FOR_ETH_TOKEN_ADDRESS
          );

          expect(postInstallETHBalanceNodeA).toBeLt(preInstallETHBalanceNodeA);

          expect(postInstallETHBalanceNodeB).toBeLt(preInstallETHBalanceNodeB);

          done();
        });

        nodeA.rpcRouter.dispatch(
          await makeProposeCall(
            nodeB,
            (global["networkContext"] as NetworkContextForTestSuite)
              .TicTacToeApp,
            undefined,
            One,
            CONVENTION_FOR_ETH_TOKEN_ADDRESS,
            One,
            CONVENTION_FOR_ETH_TOKEN_ADDRESS
          )
        );
      });
    }
  );
});
