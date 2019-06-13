import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import { ContractABI } from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { One } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber } from "ethers/utils";

import { Node, INSUFFICIENT_ERC20_FUNDS } from "../../src";

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
    await nodeA.call(depositReq.type, depositReq);
    await nodeB.call(depositReq.type, depositReq);

    expect((await provider.getBalance(multisigAddress)).toNumber()).toEqual(
      preDepositBalance.add(2).toNumber()
    );

    const freeBalanceState = await getFreeBalanceState(nodeA, multisigAddress);
    for (const key in freeBalanceState) {
      expect(freeBalanceState[key]).toEqual(One);
    }
  });

  it.only("has the right balance for both parties after deposits of ERC20 tokens", async () => {
    const multisigAddress = await createChannel(nodeA, nodeB);

    const depositReq = makeDepositRequest(
      multisigAddress,
      One,
      global["networkContext"]["DolphinCoin"]
    );

    try {
      await nodeA.call(depositReq.type, depositReq);
    } catch (e) {
      expect(e).toEqual(INSUFFICIENT_ERC20_FUNDS(await nodeA.signerAddress()));
    }

    await transferERC20Tokens(await nodeA.signerAddress());
    await transferERC20Tokens(await nodeB.signerAddress());

    const preDepositBalance = await provider.getBalance(multisigAddress);
    await nodeA.call(depositReq.type, depositReq);
    await nodeB.call(depositReq.type, depositReq);

    expect((await provider.getBalance(multisigAddress)).toNumber()).toEqual(
      preDepositBalance.add(2).toNumber()
    );

    const freeBalanceState = await getFreeBalanceState(nodeA, multisigAddress);
    for (const key in freeBalanceState) {
      expect(freeBalanceState[key]).toEqual(One);
    }
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
