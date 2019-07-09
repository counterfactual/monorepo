import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import { ContractABI } from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { One, Two, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber } from "ethers/utils";

import { Node } from "../../src";
import { INSUFFICIENT_ERC20_FUNDS } from "../../src/methods/errors";

import { setup, SetupContext } from "./setup";
import {
  createChannel,
  getFreeBalanceState,
  makeDepositRequest
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
    for (const key in freeBalanceState) {
      expect(freeBalanceState[key]).toEqual(One);
    }
  });

  it("has the right balance for both parties after deposits of ERC20 tokens and ETH", async () => {
    const multisigAddress = await createChannel(nodeA, nodeB);
    const erc20ContractAddress = global["networkContext"]["DolphinCoin"];
    const erc20Contract = new Contract(
      erc20ContractAddress,
      DolphinCoin.abi,
      new JsonRpcProvider(global["ganacheURL"])
    );

    let depositReq = makeDepositRequest(
      multisigAddress,
      One,
      erc20ContractAddress
    );

    expect(
      await erc20Contract.functions.balanceOf(await nodeA.signerAddress())
    ).toEqual(Zero);

    await expect(nodeA.router.dispatch(depositReq)).rejects.toThrowError(
      INSUFFICIENT_ERC20_FUNDS(await nodeA.signerAddress(), One, Zero)
    );

    await transferERC20Tokens(await nodeA.signerAddress());
    await transferERC20Tokens(await nodeB.signerAddress());

    let preDepositBalance = await provider.getBalance(multisigAddress);
    await nodeA.router.dispatch(depositReq);
    await nodeB.router.dispatch(depositReq);

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

    depositReq = makeDepositRequest(multisigAddress, One);

    preDepositBalance = await provider.getBalance(multisigAddress);
    await nodeA.router.dispatch(depositReq);
    await nodeB.router.dispatch(depositReq);

    expect((await provider.getBalance(multisigAddress)).toNumber()).toEqual(
      preDepositBalance.add(2).toNumber()
    );

    const freeBalanceState = await getFreeBalanceState(nodeA, multisigAddress);
    expect(Object.values(freeBalanceState)).toMatchObject([One, One]);
  });
});

/**
 * @return the ERC20 token balance of the receiver
 */
async function transferERC20Tokens(
  toAddress: string,
  tokenAddress: string = global["networkContext"]["DolphinCoin"],
  contractABI: ContractABI = DolphinCoin.abi,
  amount: BigNumber = One
): Promise<BigNumber> {
  const deployerAccount = new Wallet(
    global["fundedPrivateKey"],
    new JsonRpcProvider(global["ganacheURL"])
  );

  const contract = new Contract(tokenAddress, contractABI, deployerAccount);

  const balanceBefore: BigNumber = await contract.functions.balanceOf(
    toAddress
  );

  await contract.functions.transfer(toAddress, amount);
  const balanceAfter: BigNumber = await contract.functions.balanceOf(toAddress);

  expect(balanceAfter.sub(balanceBefore)).toEqual(amount);

  return balanceAfter;
}

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
