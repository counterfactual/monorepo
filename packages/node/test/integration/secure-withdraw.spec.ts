import { One } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";

import { CreateChannelMessage, Node, NODE_EVENTS } from "../../src";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  getMultisigCreationTransactionHash,
  makeDepositRequest,
  makeWithdrawRequest
} from "./utils";

describe("Node method follows spec - withdraw", () => {
  jest.setTimeout(30000);

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

  it("has the right balance for both parties after withdrawal", async done => {
    nodeA.on(NODE_EVENTS.CREATE_CHANNEL, async (msg: CreateChannelMessage) => {
      const { multisigAddress } = msg.data;

      expect(multisigAddress).toBeDefined();

      // Because the tests re-use the same ganache instance (and therefore
      // deterministically computed multisig address is re-used)
      const startingMultisigBalance = await provider.getBalance(
        multisigAddress
      );

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

      done();
    });
    await getMultisigCreationTransactionHash(nodeA, [
      nodeA.publicIdentifier,
      nodeB.publicIdentifier
    ]);
  });
});
