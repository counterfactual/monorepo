import { NetworkContextForTestSuite } from "@counterfactual/chain/src/contract-deployments.jest";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import { Contract } from "ethers";
import { One } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";

import { Node } from "../../src";

import { setup, SetupContext } from "./setup";
import {
  createChannel,
  makeDepositRequest,
  makeWithdrawRequest,
  transferERC20Tokens
} from "./utils";

describe("Node method follows spec - withdraw", () => {
  let nodeA: Node;
  let nodeB: Node;
  let provider: JsonRpcProvider;

  beforeEach(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    provider = new JsonRpcProvider(global["ganacheURL"]);
  });

  it("has the right balance for both parties after withdrawal", async () => {
    const multisigAddress = await createChannel(nodeA, nodeB);
    expect(multisigAddress).toBeDefined();

    // Because the tests re-use the same ganache instance (and therefore
    // deterministically computed multisig address is re-used)
    const startingMultisigBalance = await provider.getBalance(multisigAddress);

    const depositReq = makeDepositRequest(multisigAddress, One);

    await nodeA.router.dispatch(depositReq);

    const postDepositMultisigBalance = await provider.getBalance(
      multisigAddress
    );

    expect(postDepositMultisigBalance.toNumber()).toEqual(
      startingMultisigBalance.toNumber() + 1
    );

    const withdrawReq = makeWithdrawRequest(multisigAddress, One);

    await nodeA.router.dispatch(withdrawReq);

    expect((await provider.getBalance(multisigAddress)).toNumber()).toEqual(
      startingMultisigBalance.toNumber()
    );
  });

  it("has the right balance for both parties after withdrawal of ERC20 tokens", async () => {
    const multisigAddress = await createChannel(nodeA, nodeB);

    const erc20ContractAddress = (global[
      "networkContext"
    ] as NetworkContextForTestSuite).DolphinCoin;

    const erc20Contract = new Contract(
      erc20ContractAddress,
      DolphinCoin.abi,
      new JsonRpcProvider(global["ganacheURL"])
    );

    expect(multisigAddress).toBeDefined();

    await transferERC20Tokens(await nodeA.signerAddress());

    const startingMultisigTokenBalance = await erc20Contract.functions.balanceOf(
      multisigAddress
    );

    const depositReq = makeDepositRequest(
      multisigAddress,
      One,
      erc20ContractAddress
    );

    await nodeA.router.dispatch(depositReq);

    const postDepositMultisigTokenBalance = await erc20Contract.functions.balanceOf(
      multisigAddress
    );

    expect(postDepositMultisigTokenBalance.toNumber()).toEqual(
      startingMultisigTokenBalance.toNumber() + 1
    );

    const withdrawReq = makeWithdrawRequest(
      multisigAddress,
      One,
      erc20ContractAddress
    );

    await nodeA.router.dispatch(withdrawReq);

    expect(
      (await erc20Contract.functions.balanceOf(multisigAddress)).toNumber()
    ).toEqual(startingMultisigTokenBalance.toNumber());
  });
});
