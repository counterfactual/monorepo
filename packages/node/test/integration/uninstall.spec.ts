import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";
import { One, Two, Zero } from "ethers/constants";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { FinMessage } from "../../src/engine/types";
import { NODE_EVENTS, UninstallMessage } from "../../src/types";
import { toBeEq } from "../engine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  constructUninstallRpc,
  createChannel,
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

      const balancesBefore = await getFreeBalanceState(nodeA, multisigAddress);

      expect(balancesBefore[nodeA.freeBalanceAddress]).toBeEq(Zero);
      expect(balancesBefore[nodeB.freeBalanceAddress]).toBeEq(Zero);

      await collateralizeChannel(multisigAddress, nodeA, nodeB, depositAmount);

      const balancesAfter = await getFreeBalanceState(nodeA, multisigAddress);
      expect(balancesAfter[nodeA.freeBalanceAddress]).toBeEq(depositAmount);
      expect(balancesAfter[nodeB.freeBalanceAddress]).toBeEq(depositAmount);
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

        const balancesSeenByB = await getFreeBalanceState(
          nodeB,
          multisigAddress
        );
        expect(balancesSeenByB[nodeA.freeBalanceAddress]).toBeEq(Two);
        expect(balancesSeenByB[nodeB.freeBalanceAddress]).toBeEq(Zero);
        expect(await getInstalledAppInstances(nodeB)).toEqual([]);
        done();
      });

      await nodeA.rpcRouter.dispatch(constructUninstallRpc(appInstanceId));

      const balancesSeenByA = await getFreeBalanceState(nodeA, multisigAddress);
      expect(balancesSeenByA[nodeA.freeBalanceAddress]).toBeEq(Two);
      expect(balancesSeenByA[nodeB.freeBalanceAddress]).toBeEq(Zero);

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

        const balancesSeenByB = await getFreeBalanceState(
          nodeB,
          multisigAddress
        );
        expect(balancesSeenByB[nodeB.freeBalanceAddress]).toBeEq(Two);
        expect(balancesSeenByB[nodeA.freeBalanceAddress]).toBeEq(Zero);
        expect(await getInstalledAppInstances(nodeB)).toEqual([]);
        done();
      });

      await nodeA.rpcRouter.dispatch(constructUninstallRpc(appInstanceId));

      const balancesSeenByA = await getFreeBalanceState(nodeA, multisigAddress);
      expect(balancesSeenByA[nodeB.freeBalanceAddress]).toBeEq(Two);
      expect(balancesSeenByA[nodeA.freeBalanceAddress]).toBeEq(Zero);

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

        const balancesSeenByB = await getFreeBalanceState(
          nodeB,
          multisigAddress
        );
        expect(balancesSeenByB[nodeA.freeBalanceAddress]).toBeEq(depositAmount);
        expect(balancesSeenByB[nodeB.freeBalanceAddress]).toBeEq(depositAmount);
        expect(await getInstalledAppInstances(nodeB)).toEqual([]);
        done();
      });

      await nodeA.rpcRouter.dispatch(constructUninstallRpc(appInstanceId));

      const balancesSeenByA = await getFreeBalanceState(nodeA, multisigAddress);
      expect(balancesSeenByA[nodeA.freeBalanceAddress]).toBeEq(depositAmount);
      expect(balancesSeenByA[nodeB.freeBalanceAddress]).toBeEq(depositAmount);

      expect(await getInstalledAppInstances(nodeA)).toEqual([]);
    });

    it("Node B hears a UNINSTALL_FINISHED message after Node A uninstalls app", async done => {
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

      let nodeAProcessID;
      let nodeBProcessID;

      const verifyId = () => {
        if (nodeAProcessID && nodeBProcessID) {
          expect(nodeBProcessID).toEqual(nodeAProcessID);
          done();
        }
      };

      nodeA.on(NODE_EVENTS.UNINSTALL_FINISHED, async (msg: FinMessage) => {
        expect(msg.processID).toBeDefined();
        nodeAProcessID = msg.processID;
        verifyId();
      });

      nodeB.on(NODE_EVENTS.UNINSTALL_FINISHED, async (msg: FinMessage) => {
        expect(msg.processID).toBeDefined();
        nodeBProcessID = msg.processID;
        verifyId();
      });

      await nodeA.rpcRouter.dispatch(constructUninstallRpc(appInstanceId));
    });
  });
});
