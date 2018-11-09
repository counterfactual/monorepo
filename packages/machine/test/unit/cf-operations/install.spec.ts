import * as cf from "@counterfactual/cf.js";

import { OpSetup } from "../../../src/middleware/protocol-operation";

import {
  contractCall,
  TEST_FREE_BALANCE,
  TEST_FREE_BALANCE_APP_INSTANCE,
  TEST_MULTISIG_ADDRESS,
  TEST_NETWORK_CONTEXT,
  TEST_SIGNING_KEYS
} from "./fixture";

// const { keccak256 } = ethers.utils;

describe("OpSetup", () => {
  const TEST_NONCE_UNIQUE_ID = 1;
  let operation: OpSetup;

  beforeEach(() => {
    operation = new OpSetup(
      TEST_NETWORK_CONTEXT,
      TEST_MULTISIG_ADDRESS,
      TEST_FREE_BALANCE_APP_INSTANCE,
      TEST_FREE_BALANCE,
      new cf.utils.Nonce(true, TEST_NONCE_UNIQUE_ID, 0)
    );
  });

  // https://specs.counterfactual.com/04-setup-protocol#commitments
  it("Should be able to compute the correct tx to submit on-chain", () => {
    const digest = operation.hashToSign();
    const [sig1, sig2] = TEST_SIGNING_KEYS.map(key => key.signDigest(digest));

    // [this.freeBalanceInput(), this.conditionalTransactionInput()];
    const transactions = ["0x"].map(t => t.substr(2));

    const tx = operation.transaction([sig1, sig2]);
    expect(tx.to).toBe(TEST_MULTISIG_ADDRESS);
    expect(tx.value).toBe(0);
    expect(tx.data).toBe(
      contractCall("execTransaction(address, uint256, bytes, uint8, bytes)")(
        TEST_NETWORK_CONTEXT.multiSendAddr,
        0,
        contractCall("multiSend(bytes)")(`0x${transactions.join("")}`),
        1,
        cf.utils.signaturesToSortedBytes(digest, sig1, sig2)
      )
    );
  });
});
