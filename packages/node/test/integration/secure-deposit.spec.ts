import DolphinCoin from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/DolphinCoin.json";
import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { Contract } from "ethers";
import { One, Two, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import log from "loglevel";

import { Node, NODE_EVENTS } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { INSUFFICIENT_ERC20_FUNDS_TO_DEPOSIT } from "../../src/methods/errors";
import { toBeEq } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  constructDepositRpc,
  createChannel,
  getFreeBalanceState,
  getTokenIndexedFreeBalanceStates,
  transferERC20Tokens
} from "./utils";

expect.extend({ toBeEq });

log.setLevel(log.levels.SILENT);

describe("Node method follows spec - deposit", () => {
  let nodeA: Node;
  let nodeB: Node;
  let provider: JsonRpcProvider;
  let multisigAddress: string;

  beforeEach(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    provider = new JsonRpcProvider(global["ganacheURL"]);

    multisigAddress = await createChannel(nodeA, nodeB);
    expect(multisigAddress).toBeDefined();
    nodeA.off(NODE_EVENTS.DEPOSIT_CONFIRMED);
    nodeB.off(NODE_EVENTS.DEPOSIT_CONFIRMED);
  });

  it("has the right balance before an ERC20 deposit has been made", async () => {
    const erc20ContractAddress = (global[
      "networkContext"
    ] as NetworkContextForTestSuite).DolphinCoin;

    const freeBalanceState = await getFreeBalanceState(
      nodeA,
      multisigAddress,
      erc20ContractAddress
    );

    expect(Object.values(freeBalanceState)).toMatchObject([Zero, Zero]);
  });

  it("has the right balance for both parties after deposits", async done => {
    const depositReq = constructDepositRpc(multisigAddress, One);

    const preDepositBalance = await provider.getBalance(multisigAddress);

    nodeB.once(NODE_EVENTS.DEPOSIT_CONFIRMED, async () => {
      await nodeB.rpcRouter.dispatch(depositReq);
      expect(await provider.getBalance(multisigAddress)).toBeEq(
        preDepositBalance.add(2)
      );

      const freeBalanceState = await getFreeBalanceState(
        nodeA,
        multisigAddress
      );

      expect(Object.values(freeBalanceState)).toMatchObject([One, One]);
      done();
    });

    // so that the deposit from Node B doesn't throw `Recent depositConfirmedEvent which has no event handler`
    nodeA.off(NODE_EVENTS.DEPOSIT_CONFIRMED);
    await nodeA.rpcRouter.dispatch(depositReq);
  });

  it("updates balances correctly when depositing both ERC20 tokens and ETH", async () => {
    const erc20ContractAddress = (global[
      "networkContext"
    ] as NetworkContextForTestSuite).DolphinCoin;

    const erc20Contract = new Contract(
      erc20ContractAddress,
      DolphinCoin.abi,
      new JsonRpcProvider(global["ganacheURL"])
    );

    const erc20DepositRequest = constructDepositRpc(
      multisigAddress,
      One,
      erc20ContractAddress
    );

    await expect(
      nodeA.rpcRouter.dispatch(erc20DepositRequest)
    ).rejects.toThrowError(
      INSUFFICIENT_ERC20_FUNDS_TO_DEPOSIT(erc20ContractAddress, One, Zero)
    );

    await transferERC20Tokens(await nodeA.signerAddress());
    await transferERC20Tokens(await nodeB.signerAddress());

    let preDepositBalance = await provider.getBalance(multisigAddress);
    const preDepositERC20Balance = await erc20Contract.functions.balanceOf(
      multisigAddress
    );

    await nodeA.rpcRouter.dispatch(erc20DepositRequest);
    await nodeB.rpcRouter.dispatch(erc20DepositRequest);

    expect(await provider.getBalance(multisigAddress)).toEqual(
      preDepositBalance
    );

    expect(await erc20Contract.functions.balanceOf(multisigAddress)).toEqual(
      preDepositERC20Balance.add(Two)
    );

    await confirmEthAndERC20FreeBalances(
      nodeA,
      multisigAddress,
      erc20ContractAddress
    );

    await confirmEthAndERC20FreeBalances(
      nodeB,
      multisigAddress,
      erc20ContractAddress
    );

    // now deposits ETH

    const ethDepositReq = constructDepositRpc(multisigAddress, One);

    preDepositBalance = await provider.getBalance(multisigAddress);

    await nodeA.rpcRouter.dispatch(ethDepositReq);
    await nodeB.rpcRouter.dispatch(ethDepositReq);

    expect(await provider.getBalance(multisigAddress)).toBeEq(
      preDepositBalance.add(2)
    );

    const freeBalanceState = await getFreeBalanceState(nodeA, multisigAddress);

    expect(Object.values(freeBalanceState)).toMatchObject([One, One]);
  });
});

async function confirmEthAndERC20FreeBalances(
  node: Node,
  multisigAddress: string,
  erc20ContractAddress: string
) {
  const tokenIndexedFreeBalances = await getTokenIndexedFreeBalanceStates(
    node,
    multisigAddress
  );

  expect(
    Object.values(tokenIndexedFreeBalances[CONVENTION_FOR_ETH_TOKEN_ADDRESS])
  ).toMatchObject([Zero, Zero]);

  expect(
    Object.values(tokenIndexedFreeBalances[erc20ContractAddress])
  ).toMatchObject([One, One]);
}
