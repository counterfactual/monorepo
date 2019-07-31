import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";
import { One, Two, Zero } from "ethers/constants";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { NODE_EVENTS, UninstallMessage } from "../../src/types";
import { toBeEq } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  createChannel,
  generateUninstallRequest,
  getFreeBalanceState,
  getInstalledAppInstances,
  installApp
} from "./utils";

expect.extend({ toBeEq });

describe("Node A and B install apps of different outcome types, then uninstall them to test outcomes types and interpreters", () => {
  let nodeA: Node;
  let nodeB: Node;

  describe("Tests for different outcomes of the TwoPartyFixedOutcome type", () => {
    let appInstanceId: string;
    let multisigAddress: string;
    const depositAmount = One;
    let freeBalanceETH;
    const initialState = {
      versionNumber: 0,
      winner: 2, // Hard-coded winner for test
      board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    };

    beforeEach(async () => {
      const context: SetupContext = await setup(global);
      nodeA = context["A"].node;
      nodeB = context["B"].node;

      multisigAddress = await createChannel(nodeA, nodeB);

      freeBalanceETH = await getFreeBalanceState(nodeA, multisigAddress);
      expect(freeBalanceETH[nodeA.freeBalanceAddress]).toBeEq(Zero);
      expect(freeBalanceETH[nodeB.freeBalanceAddress]).toBeEq(Zero);

      await collateralizeChannel(nodeA, nodeB, multisigAddress, depositAmount);

      freeBalanceETH = await getFreeBalanceState(nodeA, multisigAddress);
      expect(freeBalanceETH[nodeA.freeBalanceAddress]).toBeEq(depositAmount);
      expect(freeBalanceETH[nodeB.freeBalanceAddress]).toBeEq(depositAmount);
    });

    it("installs an app with the TwoPartyFixedOutcome outcome and expects Node A to win total", async done => {
      [appInstanceId] = await installApp(
        nodeA,
        nodeB,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
        initialState,
        depositAmount,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        depositAmount,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      nodeB.once(NODE_EVENTS.UNINSTALL, async (msg: UninstallMessage) => {
        expect(msg.data.appInstanceId).toBe(appInstanceId);

        freeBalanceETH = await getFreeBalanceState(nodeA, multisigAddress);
        expect(freeBalanceETH[nodeA.freeBalanceAddress]).toBeEq(Two);
        expect(freeBalanceETH[nodeB.freeBalanceAddress]).toBeEq(Zero);
        expect(await getInstalledAppInstances(nodeB)).toEqual([]);
        done();
      });

      await nodeA.rpcRouter.dispatch(generateUninstallRequest(appInstanceId));

      expect(await getInstalledAppInstances(nodeA)).toEqual([]);
    });

    it("installs an app with the TwoPartyFixedOutcome outcome and expects Node B to win total", async done => {
      initialState.winner = 1;

      [appInstanceId] = await installApp(
        nodeA,
        nodeB,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
        initialState,
        depositAmount,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        depositAmount,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      nodeB.once(NODE_EVENTS.UNINSTALL, async (msg: UninstallMessage) => {
        expect(msg.data.appInstanceId).toBe(appInstanceId);

        freeBalanceETH = await getFreeBalanceState(nodeA, multisigAddress);
        expect(freeBalanceETH[nodeB.freeBalanceAddress]).toBeEq(Two);
        expect(freeBalanceETH[nodeA.freeBalanceAddress]).toBeEq(Zero);
        expect(await getInstalledAppInstances(nodeB)).toEqual([]);
        done();
      });

      await nodeA.rpcRouter.dispatch(generateUninstallRequest(appInstanceId));

      expect(await getInstalledAppInstances(nodeA)).toEqual([]);
    });

    it("installs an app with the TwoPartyFixedOutcome outcome and expects the funds to be split between the nodes", async done => {
      initialState.winner = 3;

      [appInstanceId] = await installApp(
        nodeA,
        nodeB,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
        initialState,
        depositAmount,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        depositAmount,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      nodeB.once(NODE_EVENTS.UNINSTALL, async (msg: UninstallMessage) => {
        expect(msg.data.appInstanceId).toBe(appInstanceId);

        freeBalanceETH = await getFreeBalanceState(nodeA, multisigAddress);
        expect(freeBalanceETH[nodeA.freeBalanceAddress]).toBeEq(depositAmount);
        expect(freeBalanceETH[nodeB.freeBalanceAddress]).toBeEq(depositAmount);
        expect(await getInstalledAppInstances(nodeB)).toEqual([]);
        done();
      });

      await nodeA.rpcRouter.dispatch(generateUninstallRequest(appInstanceId));

      expect(await getInstalledAppInstances(nodeA)).toEqual([]);
    });
  });
});
