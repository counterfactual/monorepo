import { NetworkContextForTestSuite } from "@counterfactual/chain/src/contract-deployments.jest";
import { Node as NodeTypes } from "@counterfactual/types";
import { One } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import { Node, NULL_INITIAL_STATE_FOR_PROPOSAL } from "../../src";
import { xkeyKthAddress } from "../../src/machine";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/models/free-balance";
import { InstallMessage, NODE_EVENTS, ProposeMessage } from "../../src/types";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  confirmProposedAppInstanceOnNode,
  createChannel,
  getAppInstanceProposal,
  getFreeBalanceState,
  getInstalledAppInstances,
  makeInstallCall,
  makeProposeCall,
  makeTTTProposalRequest,
  transferERC20Tokens
} from "./utils";

describe("Node method follows spec - install", () => {
  let multisigAddress: string;
  let nodeA: Node;
  let nodeB: Node;
  let appInstanceId: string;
  let proposalParams: NodeTypes.ProposeInstallParams;

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

      // FIXME: DRY this test suite
      it("install app with ETH", async done => {
        await collateralizeChannel(nodeA, nodeB, multisigAddress);

        let preInstallETHBalanceNodeA: BigNumber;
        let postInstallETHBalanceNodeA: BigNumber;
        let preInstallETHBalanceNodeB: BigNumber;
        let postInstallETHBalanceNodeB: BigNumber;

        nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
          await confirmProposedAppInstanceOnNode(
            proposalParams,
            await getAppInstanceProposal(nodeA, appInstanceId)
          );

          const ethFreeBalanceState = await getFreeBalanceState(
            nodeA,
            multisigAddress
          );

          preInstallETHBalanceNodeA =
            ethFreeBalanceState[xkeyKthAddress(nodeA.publicIdentifier, 0)];

          const erc20FreeBalanceState = await getFreeBalanceState(
            nodeB,
            multisigAddress
          );

          preInstallETHBalanceNodeB =
            erc20FreeBalanceState[xkeyKthAddress(nodeB.publicIdentifier, 0)];

          makeInstallCall(nodeB, msg.data.appInstanceId);
        });

        nodeA.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
          const [appInstanceNodeA] = await getInstalledAppInstances(nodeA);
          const [appInstanceNodeB] = await getInstalledAppInstances(nodeB);
          expect(appInstanceNodeA).toEqual(appInstanceNodeB);

          const ethFreeBalanceState = await getFreeBalanceState(
            nodeA,
            multisigAddress
          );

          postInstallETHBalanceNodeA =
            ethFreeBalanceState[xkeyKthAddress(nodeA.publicIdentifier, 0)];

          expect(
            postInstallETHBalanceNodeA.lt(preInstallETHBalanceNodeA)
          ).toEqual(true);

          const erc20FreeBalanceState = await getFreeBalanceState(
            nodeB,
            multisigAddress
          );

          postInstallETHBalanceNodeB =
            erc20FreeBalanceState[xkeyKthAddress(nodeB.publicIdentifier, 0)];

          expect(
            postInstallETHBalanceNodeB.lt(preInstallETHBalanceNodeB)
          ).toEqual(true);

          done();
        });

        const result = await makeProposeCall(
          nodeA,
          nodeB,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
          {},
          One,
          CONVENTION_FOR_ETH_TOKEN_ADDRESS,
          One,
          CONVENTION_FOR_ETH_TOKEN_ADDRESS
        );

        appInstanceId = result.appInstanceId;

        proposalParams = result.params;
      });

      it("install app with ERC20", async done => {
        await transferERC20Tokens(await nodeA.signerAddress());
        await transferERC20Tokens(await nodeB.signerAddress());

        const erc20TokenAddress = (global[
          "networkContext"
        ] as NetworkContextForTestSuite).DolphinCoin;

        await collateralizeChannel(
          nodeA,
          nodeB,
          multisigAddress,
          One,
          erc20TokenAddress
        );

        let proposalParams: NodeTypes.ProposeInstallParams;

        let preInstallERC20BalanceNodeA: BigNumber;
        let postInstallERC20BalanceNodeA: BigNumber;
        let preInstallERC20BalanceNodeB: BigNumber;
        let postInstallERC20BalanceNodeB: BigNumber;

        nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
          await confirmProposedAppInstanceOnNode(
            proposalParams,
            await getAppInstanceProposal(nodeA, appInstanceId)
          );

          let erc20FreeBalanceState = await getFreeBalanceState(
            nodeA,
            multisigAddress,
            erc20TokenAddress
          );

          preInstallERC20BalanceNodeA =
            erc20FreeBalanceState[xkeyKthAddress(nodeA.publicIdentifier, 0)];

          erc20FreeBalanceState = await getFreeBalanceState(
            nodeB,
            multisigAddress,
            erc20TokenAddress
          );

          preInstallERC20BalanceNodeB =
            erc20FreeBalanceState[xkeyKthAddress(nodeB.publicIdentifier, 0)];

          makeInstallCall(nodeB, msg.data.appInstanceId);
        });

        nodeA.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
          const [appInstanceNodeA] = await getInstalledAppInstances(nodeA);
          const [appInstanceNodeB] = await getInstalledAppInstances(nodeB);
          expect(appInstanceNodeA).toEqual(appInstanceNodeB);

          let erc20FreeBalanceState = await getFreeBalanceState(
            nodeA,
            multisigAddress,
            erc20TokenAddress
          );

          postInstallERC20BalanceNodeA =
            erc20FreeBalanceState[xkeyKthAddress(nodeA.publicIdentifier, 0)];

          expect(
            postInstallERC20BalanceNodeA.lt(preInstallERC20BalanceNodeA)
          ).toEqual(true);

          erc20FreeBalanceState = await getFreeBalanceState(
            nodeB,
            multisigAddress,
            erc20TokenAddress
          );

          postInstallERC20BalanceNodeB =
            erc20FreeBalanceState[xkeyKthAddress(nodeB.publicIdentifier, 0)];

          expect(
            postInstallERC20BalanceNodeB.lt(preInstallERC20BalanceNodeB)
          ).toEqual(true);

          done();
        });

        const result = await makeProposeCall(
          nodeA,
          nodeB,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
          {},
          One,
          erc20TokenAddress,
          One,
          erc20TokenAddress
        );

        appInstanceId = result.appInstanceId;

        proposalParams = result.params;
      });

      it("sends proposal with null initial state", async () => {
        const appInstanceProposalReq = makeTTTProposalRequest(
          nodeA.publicIdentifier,
          nodeB.publicIdentifier,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
        );

        appInstanceProposalReq.parameters["initialState"] = undefined;

        await expect(
          nodeA.rpcRouter.dispatch(appInstanceProposalReq)
        ).rejects.toThrowError(NULL_INITIAL_STATE_FOR_PROPOSAL);
      });
    }
  );
});
