import { HashZero, One, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { getAddress, hexlify, randomBytes } from "ethers/utils";
import log from "loglevel";

import { Node, NODE_EVENTS } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { toBeEq } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  constructWithdrawRpc,
  createChannel,
  deployStateDepositHolder,
  deposit
} from "./utils";

expect.extend({ toBeEq });

log.setLevel(log.levels.SILENT);

describe("Node method follows spec - deploy state desposit holder", () => {
  let nodeA: Node;
  let nodeB: Node;
  let provider: JsonRpcProvider;
  let multisigAddress: string;

  beforeEach(async () => {
    const context: SetupContext = await setup(global, true, true);
    provider = new JsonRpcProvider(global["ganacheURL"]);
    nodeA = context["A"].node;
    nodeB = context["B"].node;

    multisigAddress = await createChannel(nodeA, nodeB);
    expect(multisigAddress).toBeDefined();
    nodeA.off(NODE_EVENTS.DEPOSIT_CONFIRMED);
    nodeB.off(NODE_EVENTS.DEPOSIT_CONFIRMED);
  });

  it("deploys the multisig when the method is called", async () => {
    const deployTxHash = await deployStateDepositHolder(nodeA, multisigAddress);

    expect(deployTxHash).toBeDefined();
    expect(deployTxHash !== HashZero).toBeTruthy();
  });

  it("cannot withdraw when multisig has not been deployed", async () => {
    const startingMultisigBalance = await provider.getBalance(multisigAddress);
    await deposit(nodeA, multisigAddress, One);

    const postDepositMultisigBalance = await provider.getBalance(
      multisigAddress
    );

    expect(postDepositMultisigBalance).toBeEq(startingMultisigBalance.add(One));

    const recipient = getAddress(hexlify(randomBytes(20)));

    expect(await provider.getBalance(recipient)).toBeEq(Zero);

    const withdrawReq = constructWithdrawRpc(
      multisigAddress,
      One,
      CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      recipient
    );

    expect(nodeA.rpcRouter.dispatch(withdrawReq)).rejects.toBeDefined();
  });
});
