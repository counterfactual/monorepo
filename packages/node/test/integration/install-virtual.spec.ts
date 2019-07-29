import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";
import { Node as NodeTypes } from "@counterfactual/types";
import { One } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import { Node } from "../../src";
import { xkeyKthAddress } from "../../src/machine";
import { NODE_EVENTS, ProposeVirtualMessage } from "../../src/types";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  confirmProposedVirtualAppInstance,
  createChannel,
  getFreeBalanceState,
  getInstalledAppInstances,
  getProposedAppInstances,
  installTTTVirtual,
  makeVirtualProposal,
  transferERC20Tokens
} from "./utils";

describe("Node method follows spec - proposeInstallVirtual", () => {
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;
  let multisigAddressAB: string;
  let multisigAddressBC: string;

  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. All Nodes confirm receipt of proposal",
    () => {
      beforeEach(async () => {
        const context: SetupContext = await setup(global, true);
        nodeA = context["A"].node;
        nodeB = context["B"].node;
        nodeC = context["C"].node;

        multisigAddressAB = await createChannel(nodeA, nodeB);
        multisigAddressBC = await createChannel(nodeB, nodeC);
      });

      it("sends proposal with non-null initial state", async done => {
        await collateralizeChannel(nodeA, nodeB, multisigAddressAB);
        await collateralizeChannel(nodeB, nodeC, multisigAddressBC);

        let proposalParams: NodeTypes.ProposeInstallVirtualParams;
        nodeA.once(NODE_EVENTS.INSTALL_VIRTUAL, async () => {
          const [virtualAppNodeA] = await getInstalledAppInstances(nodeA);

          const [virtualAppNodeC] = await getInstalledAppInstances(nodeC);

          expect(virtualAppNodeA).toEqual(virtualAppNodeC);

          done();
        });

        nodeC.once(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          async (msg: ProposeVirtualMessage) => {
            const { appInstanceId } = msg.data;
            const { intermediaries } = msg.data.params;
            const [proposedAppNodeA] = await getProposedAppInstances(nodeA);
            const [proposedAppNodeC] = await getProposedAppInstances(nodeC);

            confirmProposedVirtualAppInstance(proposalParams, proposedAppNodeA);
            confirmProposedVirtualAppInstance(
              proposalParams,
              proposedAppNodeC,
              true
            );

            expect(proposedAppNodeC.proposedByIdentifier).toEqual(
              nodeA.publicIdentifier
            );
            expect(proposedAppNodeA.identityHash).toEqual(
              proposedAppNodeC.identityHash
            );
            installTTTVirtual(nodeC, appInstanceId, intermediaries);
          }
        );

        const result = await makeVirtualProposal(
          nodeA,
          nodeC,
          nodeB,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
        );
        proposalParams = result.params as NodeTypes.ProposeInstallVirtualParams;
      });

      it("sends proposal with non-null initial state - ERC20", async done => {
        await transferERC20Tokens(await nodeA.signerAddress());
        await transferERC20Tokens(await nodeB.signerAddress());
        await transferERC20Tokens(await nodeC.signerAddress());

        const erc20TokenAddress = (global[
          "networkContext"
        ] as NetworkContextForTestSuite).DolphinCoin;

        await collateralizeChannel(
          nodeA,
          nodeB,
          multisigAddressAB,
          One,
          erc20TokenAddress
        );
        await collateralizeChannel(
          nodeB,
          nodeC,
          multisigAddressBC,
          One,
          erc20TokenAddress
        );

        let proposalParams: NodeTypes.ProposeInstallVirtualParams;
        let preInstallERC20BalanceNodeA: BigNumber;
        let postInstallERC20BalanceNodeA: BigNumber;
        let preInstallERC20BalanceNodeBA: BigNumber;
        let postInstallERC20BalanceNodeBA: BigNumber;
        let preInstallERC20BalanceNodeBC: BigNumber;
        let postInstallERC20BalanceNodeBC: BigNumber;
        let preInstallERC20BalanceNodeC: BigNumber;
        let postInstallERC20BalanceNodeC: BigNumber;

        nodeA.once(NODE_EVENTS.INSTALL_VIRTUAL, async () => {
          const [virtualAppNodeA] = await getInstalledAppInstances(nodeA);

          const [virtualAppNodeC] = await getInstalledAppInstances(nodeC);

          expect(virtualAppNodeA).toEqual(virtualAppNodeC);

          [
            postInstallERC20BalanceNodeA,
            postInstallERC20BalanceNodeBA
          ] = await getBalances(
            nodeA,
            nodeB,
            multisigAddressAB,
            erc20TokenAddress
          );

          [
            postInstallERC20BalanceNodeBC,
            postInstallERC20BalanceNodeC
          ] = await getBalances(
            nodeA,
            nodeB,
            multisigAddressBC,
            erc20TokenAddress
          );

          expect(postInstallERC20BalanceNodeA).toBeLt(
            preInstallERC20BalanceNodeA
          );

          expect(postInstallERC20BalanceNodeBA).toBeLt(
            preInstallERC20BalanceNodeBA
          );

          expect(postInstallERC20BalanceNodeBC).toBeLt(
            preInstallERC20BalanceNodeBC
          );

          expect(postInstallERC20BalanceNodeC).toBeLt(
            preInstallERC20BalanceNodeC
          );

          done();
        });

        nodeC.once(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          async (msg: ProposeVirtualMessage) => {
            const { appInstanceId } = msg.data;
            const { intermediaries } = msg.data.params;
            const [proposedAppNodeA] = await getProposedAppInstances(nodeA);
            const [proposedAppNodeC] = await getProposedAppInstances(nodeC);

            [
              preInstallERC20BalanceNodeA,
              preInstallERC20BalanceNodeBA
            ] = await getBalances(
              nodeA,
              nodeB,
              multisigAddressAB,
              erc20TokenAddress
            );

            [
              preInstallERC20BalanceNodeBC,
              preInstallERC20BalanceNodeC
            ] = await getBalances(
              nodeA,
              nodeB,
              multisigAddressBC,
              erc20TokenAddress
            );

            confirmProposedVirtualAppInstance(proposalParams, proposedAppNodeA);
            confirmProposedVirtualAppInstance(
              proposalParams,
              proposedAppNodeC,
              true
            );

            expect(proposedAppNodeC.proposedByIdentifier).toEqual(
              nodeA.publicIdentifier
            );
            expect(proposedAppNodeA.identityHash).toEqual(
              proposedAppNodeC.identityHash
            );
            installTTTVirtual(nodeC, appInstanceId, intermediaries);
          }
        );

        const result = await makeVirtualProposal(
          nodeA,
          nodeC,
          nodeB,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
        );
        proposalParams = result.params as NodeTypes.ProposeInstallVirtualParams;
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
