import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { xkeyKthAddress } from "../../src/machine";
import { NODE_EVENTS, ProposeMessage } from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  createChannel,
  getFreeBalanceState,
  getInstalledAppInstances,
  makeInstallCall,
  makeAndSendProposeCall,
} from "./utils";

expect.extend({ toBeLt });

describe("Node method follows spec - install", () => {
  let multisigAddress: string;
  let nodeA: Node;
  let nodeB: Node;

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it, " +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      beforeEach(async () => {
        const context: SetupContext = await setup(global);
        nodeA = context["A"].node;
        nodeB = context["B"].node;

        multisigAddress = await createChannel(nodeA, nodeB);
      });

      it("install app with ETH", async done => {
        await collateralizeChannel(nodeA, nodeB, multisigAddress);

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

        await makeAndSendProposeCall(
          nodeA,
          nodeB,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
          undefined,
          One,
          CONVENTION_FOR_ETH_TOKEN_ADDRESS,
          One,
          CONVENTION_FOR_ETH_TOKEN_ADDRESS
        );
      });
    }
  );
});

async function getBalances(
  nodeA: Node,
  nodeB: Node,
  multisigAddress: string,
  tokenAddress: string
) {
  let tokenFreeBalanceState = await getFreeBalanceState(
    nodeA,
    multisigAddress,
    tokenAddress
  );

  const tokenBalanceNodeA =
    tokenFreeBalanceState[xkeyKthAddress(nodeA.publicIdentifier, 0)];

  tokenFreeBalanceState = await getFreeBalanceState(
    nodeB,
    multisigAddress,
    tokenAddress
  );

  const tokenBalanceNodeB =
    tokenFreeBalanceState[xkeyKthAddress(nodeB.publicIdentifier, 0)];

  return [tokenBalanceNodeA, tokenBalanceNodeB];
}
