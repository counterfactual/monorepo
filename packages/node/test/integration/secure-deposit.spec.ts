import { NetworkContextForTestSuite } from "@counterfactual/chain/src/contract-deployments.jest";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import { Contract } from "ethers";
import { One, Two, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";

import { Node } from "../../src";
import { INSUFFICIENT_ERC20_FUNDS_TO_DEPOSIT } from "../../src/methods/errors";

import { setup, SetupContext } from "./setup";
import {
  createChannel,
  getFreeBalanceState,
  makeDepositRequest,
  transferERC20Tokens
} from "./utils";

describe("Node method follows spec - deposit", () => {
  let nodeA: Node;
  let nodeB: Node;
  let provider: JsonRpcProvider;

  beforeEach(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    provider = new JsonRpcProvider(global["ganacheURL"]);
  });

  it("has the right balance for both parties after deposits", async () => {
    const multisigAddress = await createChannel(nodeA, nodeB);
    const depositReq = makeDepositRequest(multisigAddress, One);

    const preDepositBalance = await provider.getBalance(multisigAddress);
    await nodeA.router.dispatch(depositReq);
    await nodeB.router.dispatch(depositReq);

    expect((await provider.getBalance(multisigAddress)).toNumber()).toEqual(
      preDepositBalance.add(2).toNumber()
    );

    const freeBalanceState = await getFreeBalanceState(nodeA, multisigAddress);

    expect(Object.values(freeBalanceState)).toMatchObject([One, One]);
  });

  it("updates balances correctly when depositing both ERC20 tokens and ETH", async () => {
    const multisigAddress = await createChannel(nodeA, nodeB);

    const erc20ContractAddress = (global[
      "networkContext"
    ] as NetworkContextForTestSuite).DolphinCoin;

    const erc20Contract = new Contract(
      erc20ContractAddress,
      DolphinCoin.abi,
      new JsonRpcProvider(global["ganacheURL"])
    );

    const erc20DepositRequest = makeDepositRequest(
      multisigAddress,
      One,
      erc20ContractAddress
    );

    expect(
      await erc20Contract.functions.balanceOf(await nodeA.signerAddress())
    ).toEqual(Zero);

    await expect(
      nodeA.router.dispatch(erc20DepositRequest)
    ).rejects.toThrowError(
      INSUFFICIENT_ERC20_FUNDS_TO_DEPOSIT(
        await nodeA.signerAddress(),
        One,
        Zero
      )
    );

    await transferERC20Tokens(await nodeA.signerAddress());
    await transferERC20Tokens(await nodeB.signerAddress());

    let preDepositBalance = await provider.getBalance(multisigAddress);

    await nodeA.router.dispatch(erc20DepositRequest);
    await nodeB.router.dispatch(erc20DepositRequest);

    expect(await provider.getBalance(multisigAddress)).toEqual(
      preDepositBalance
    );

    expect(await erc20Contract.functions.balanceOf(multisigAddress)).toEqual(
      Two
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

    const ethDepositReq = makeDepositRequest(multisigAddress, One);

    preDepositBalance = await provider.getBalance(multisigAddress);

    await nodeA.router.dispatch(ethDepositReq);
    await nodeB.router.dispatch(ethDepositReq);

    expect((await provider.getBalance(multisigAddress)).toNumber()).toEqual(
      preDepositBalance.add(2).toNumber()
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
  const ethFreeBalanceState = await getFreeBalanceState(node, multisigAddress);

  expect(Object.values(ethFreeBalanceState)).toMatchObject([Zero, Zero]);

  const dolphinCoinFreeBalance = await getFreeBalanceState(
    node,
    multisigAddress,
    erc20ContractAddress
  );

  expect(Object.values(dolphinCoinFreeBalance)).toMatchObject([One, One]);
}
