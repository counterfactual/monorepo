import { NetworkContextForTestSuite } from "@counterfactual/chain/src/contract-deployments.jest";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import { randomBytes } from "crypto";
import { Contract } from "ethers";
import { One, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { getAddress, hexlify, parseEther } from "ethers/utils";

import { Node, NODE_EVENTS } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/models/free-balance";
import { toBeEq } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  createChannel,
  makeDepositRequest,
  makeWithdrawRequest,
  transferERC20Tokens
} from "./utils";

expect.extend({ toBeEq });

describe.only("Node method follows spec - withdraw", () => {
  let nodeA: Node;
  let nodeB: Node;
  let provider: JsonRpcProvider;

  beforeEach(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    provider = new JsonRpcProvider(global["ganacheURL"]);
  });

  it.only("should reproduce the errors connext sees", async () => {
    const depositAmount = parseEther("0.1");
    const multisigAddress = await createChannel(nodeA, nodeB);
    expect(multisigAddress).toBeDefined();

    const startingMultisigBalance = await provider.getBalance(multisigAddress);

    const depositReq = makeDepositRequest(multisigAddress, depositAmount);

    const p = new Promise((resolve, reject) => {
      nodeB.once(NODE_EVENTS.DEPOSIT_CONFIRMED, () => {
        resolve()
      });
      nodeB.once(NODE_EVENTS.DEPOSIT_FAILED, () => {
        reject()
      });
    })
    await nodeA.rpcRouter.dispatch(depositReq);
    await p;

    const postDepositMultisigBalance = await provider.getBalance(
      multisigAddress
    );

    expect(postDepositMultisigBalance).toBeEq(startingMultisigBalance.add(depositAmount));

    const recipient = getAddress(hexlify(randomBytes(20)));

    expect(await provider.getBalance(recipient)).toBeEq(Zero);

    const withdrawalAmount = parseEther("0.01");

    const withdrawReq = makeWithdrawRequest(
      multisigAddress,
      withdrawalAmount,
      CONVENTION_FOR_ETH_TOKEN_ADDRESS,
    );

    const {
      result: {
        result: { txHash }
      }
    } = await nodeA.rpcRouter.dispatch(withdrawReq);

    expect(txHash).toBeDefined();
    expect(txHash.length).toBe(66);
    expect(txHash.substr(0, 2)).toBe("0x");

    // get tx info
    const txInfo = await provider.getTransaction(txHash);

    const expectedBal = depositAmount.sub(withdrawalAmount);

    expect(await provider.getBalance(multisigAddress)).toBeEq(
      expectedBal
    );

    expect(txInfo.to).toBe(recipient);
    // FIXME: what address sends transactions by default?
    // expect(txInfo.from).toBe(nodeA.freeBalanceAddress);
    expect(txInfo.value).toBeEq(withdrawalAmount);

    expect(await provider.getBalance(recipient)).toBeEq(withdrawalAmount);
  })

  it("has the right balance for both parties after withdrawal", async () => {
    const multisigAddress = await createChannel(nodeA, nodeB);
    expect(multisigAddress).toBeDefined();

    // Because the tests re-use the same ganache instance (and therefore
    // deterministically computed multisig address is re-used)
    const startingMultisigBalance = await provider.getBalance(multisigAddress);

    const depositReq = makeDepositRequest(multisigAddress, One);

    nodeB.on(NODE_EVENTS.DEPOSIT_CONFIRMED, () => {});
    await nodeA.rpcRouter.dispatch(depositReq);

    const postDepositMultisigBalance = await provider.getBalance(
      multisigAddress
    );

    expect(postDepositMultisigBalance).toBeEq(startingMultisigBalance.add(One));

    const recipient = getAddress(hexlify(randomBytes(20)));

    expect(await provider.getBalance(recipient)).toBeEq(Zero);

    const withdrawReq = makeWithdrawRequest(
      multisigAddress,
      One,
      CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      recipient
    );

    const {
      result: {
        result: { txHash }
      }
    } = await nodeA.rpcRouter.dispatch(withdrawReq);

    expect(txHash).toBeDefined();
    expect(txHash.length).toBe(66);
    expect(txHash.substr(0, 2)).toBe("0x");

    expect(await provider.getBalance(multisigAddress)).toBeEq(
      startingMultisigBalance
    );

    expect(await provider.getBalance(recipient)).toBeEq(One);
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

    nodeB.on(NODE_EVENTS.DEPOSIT_CONFIRMED, () => {});
    await nodeA.rpcRouter.dispatch(depositReq);

    const postDepositMultisigTokenBalance = await erc20Contract.functions.balanceOf(
      multisigAddress
    );

    expect(postDepositMultisigTokenBalance).toBeEq(
      startingMultisigTokenBalance.add(One)
    );

    const recipient = getAddress(hexlify(randomBytes(20)));

    expect(await erc20Contract.functions.balanceOf(recipient)).toBeEq(Zero);

    const withdrawReq = makeWithdrawRequest(
      multisigAddress,
      One,
      erc20ContractAddress,
      recipient
    );

    await nodeA.rpcRouter.dispatch(withdrawReq);

    expect(await erc20Contract.functions.balanceOf(multisigAddress)).toBeEq(
      startingMultisigTokenBalance
    );

    expect(await erc20Contract.functions.balanceOf(recipient)).toBeEq(One);
  });
});
