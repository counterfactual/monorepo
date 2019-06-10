// @ts-ignore - firebase-server depends on node being transpiled first, circular dependency
import { LocalFirebaseServiceFactory } from "@counterfactual/firebase-server";
import { One } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";

import { Node } from "../../src";

import { setup } from "./setup";
import {
  createChannel,
  getFreeBalanceState,
  makeDepositRequest
} from "./utils";

describe("Node method follows spec - deposit", () => {
  let nodeA: Node;
  let nodeB: Node;
  let provider: JsonRpcProvider;

  beforeAll(async () => {
    const result = await setup(global);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
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
});
