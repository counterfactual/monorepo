import * as cf from "@counterfactual/cf.js";

import { OpSetup } from "../../../src/middleware/protocol-operation";

import {
  ethContractCall,
  ethMultiSendSubCall,
  TEST_APP_STATE_HASH,
  TEST_FREE_BALANCE,
  TEST_FREE_BALANCE_APP_INSTANCE,
  TEST_LOCAL_NONCE,
  TEST_MULTISIG_ADDRESS,
  TEST_NETWORK_CONTEXT,
  TEST_SIGNING_KEYS,
  TEST_TIMEOUT
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

    // const app = new cf.app.AppInstance(
    //   TEST_NETWORK_CONTEXT,
    //   TEST_MULTISIG_ADDRESS,
    //   TEST_PARTICIPANTS,
    //   TEST_APP_INTERFACE,
    //   TEST_TERMS,
    //   TEST_TIMEOUT,
    //   TEST_APP_UNIQUE_ID
    // );

    // [this.freeBalanceInput(), this.conditionalTransactionInput()];
    const multiSendTxs = [
      ethMultiSendSubCall(
        "call",
        TEST_NETWORK_CONTEXT.registryAddr,
        0,
        ethContractCall("proxyCall(address,bytes32,bytes)")(
          TEST_NETWORK_CONTEXT.registryAddr,
          TEST_FREE_BALANCE_APP_INSTANCE.cfAddress(),
          ethContractCall("setState(bytes32,uint256,uint256,bytes)")(
            TEST_APP_STATE_HASH,
            TEST_LOCAL_NONCE,
            TEST_TIMEOUT,
            cf.utils.signaturesToSortedBytes(digest, sig1, sig2)
          )
        )
      ),
      ethMultiSendSubCall(
        "delegatecall",
        TEST_NETWORK_CONTEXT.conditionalTransactionAddr,
        0,
        ethContractCall("yolo()")()
      )
    ];
    const tx = operation.transaction([sig1, sig2]);
    expect(tx.to).toBe(TEST_MULTISIG_ADDRESS);
    expect(tx.value).toBe(0);
    expect(tx.data).toBe(
      ethContractCall("execTransaction(address, uint256, bytes, uint8, bytes)")(
        TEST_NETWORK_CONTEXT.multiSendAddr,
        0,
        ethContractCall("multiSend(bytes)")(
          `0x${multiSendTxs.map(t => t.substr(2)).join("")}`
        ),
        1,
        cf.utils.signaturesToSortedBytes(digest, sig1, sig2)
      )
    );
  });
});
