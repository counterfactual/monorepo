import { One } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";

import { CreateChannelMessage, Node, NODE_EVENTS } from "../../src";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  getFreeBalanceState,
  getMultisigCreationTransactionHash,
  makeDepositRequest
} from "./utils";

describe("Node method follows spec - deposit", () => {
  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let nodeA: Node;
  let nodeB: Node;
  let provider: JsonRpcProvider;

  beforeAll(async () => {
    const result = await setup(global);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    firebaseServiceFactory = result.firebaseServiceFactory;
    provider = new JsonRpcProvider(global["ganacheURL"]);
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  it("has the right balance for both parties after deposits", async done => {
    nodeA.on(NODE_EVENTS.CREATE_CHANNEL, async (msg: CreateChannelMessage) => {
      const { multisigAddress } = msg.data;
      const depositReq = makeDepositRequest(multisigAddress, One);

      const preDepositBalance = await provider.getBalance(multisigAddress);

      await nodeA.call(depositReq.type, depositReq);

      await nodeB.call(depositReq.type, depositReq);

      expect((await provider.getBalance(multisigAddress)).toNumber()).toEqual(
        preDepositBalance.add(2).toNumber()
      );

      const freeBalanceState = await getFreeBalanceState(
        nodeA,
        multisigAddress
      );

      for (const key in freeBalanceState) {
        expect(freeBalanceState[key]).toEqual(One);
      }

      done();
    });
    await getMultisigCreationTransactionHash(nodeA, [
      nodeA.publicIdentifier,
      nodeB.publicIdentifier
    ]);
  });
});
