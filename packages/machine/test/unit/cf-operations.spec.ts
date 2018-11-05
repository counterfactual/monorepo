import { AssetType } from "@counterfactual/contracts/dist/utils";
import * as ethers from "ethers";

import { CfOpSetup } from "../../src/middleware/cf-operation";
import {
  CfAppInstance,
  CfAppInterface,
  CfFreeBalance,
  CfNonce,
  Terms
} from "../../src/middleware/cf-operation/types";
import { NetworkContext } from "../../src/utils";

const fakeCtx = new NetworkContext(
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
  "0x4444444444444444444444444444444444444444",
  "0x5555555555555555555555555555555555555555",
  "0x6666666666666666666666666666666666666666",
  "0x7777777777777777777777777777777777777777",
  "0x8888888888888888888888888888888888888888"
);
const alice = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const bob = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const multisig = "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";

describe("CFOperation subclasses", async () => {
  describe("CfOpSetup", async () => {
    it("generates a correct transaction", async () => {
      const appInterface = new CfAppInterface(
        "0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
        "0x00000000",
        "0x00000000",
        "0x00000000",
        "0x00000000",
        "tuple()"
      );
      const terms = new Terms(
        AssetType.ETH,
        ethers.utils.parseEther("1"),
        ethers.constants.AddressZero
      );
      const cfApp = new CfAppInstance(
        fakeCtx,
        multisig,
        [alice, bob],
        appInterface,
        terms,
        100,
        0
      );
      const fakeNonce = new CfNonce(false, 0, 0);
      const freeBal = new CfFreeBalance(
        alice,
        ethers.utils.parseEther("0.5"),
        bob,
        ethers.utils.parseEther("0.5"),
        1,
        0,
        100,
        fakeNonce
      );
      const op = new CfOpSetup(fakeCtx, multisig, cfApp, freeBal, fakeNonce);
      const transaction = op.transaction([]);
      expect(transaction.to).toBe(multisig);
      expect(transaction.value).toBe(0);
      // TODO: verify transaction data
    });
  });
});
