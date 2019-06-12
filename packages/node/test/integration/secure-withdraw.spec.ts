import { One } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";

import { Node } from "../../src";

import { setup, SetupContext } from "./setup";
import {
  createChannel,
  makeDepositRequest,
  makeWithdrawRequest
} from "./utils";

describe("Node method follows spec - withdraw", () => {
  let nodeA: Node;
  let nodeB: Node;
  let provider: JsonRpcProvider;

  beforeAll(async () => {
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

    await nodeA.call(depositReq.type, depositReq);

    const postDepositMultisigBalance = await provider.getBalance(
      multisigAddress
    );

    expect(postDepositMultisigBalance.toNumber()).toEqual(
      startingMultisigBalance.toNumber() + 1
    );

    const withdrawReq = makeWithdrawRequest(multisigAddress, One);

    await nodeA.call(withdrawReq.type, withdrawReq);

    expect((await provider.getBalance(multisigAddress)).toNumber()).toEqual(
      startingMultisigBalance.toNumber()
    );
  });
});
