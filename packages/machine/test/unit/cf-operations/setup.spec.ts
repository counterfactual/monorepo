import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { OpSetup } from "../../../src/middleware/protocol-operation";

import {
  constructContractCall,
  constructMultisigExecTransaction,
  TEST_FREE_BALANCE,
  TEST_FREE_BALANCE_APP_INSTANCE,
  TEST_MULTISIG_ADDRESS,
  TEST_NETWORK_CONTEXT,
  TEST_SIGNING_KEYS
} from "./fixture";

const { keccak256 } = ethers.utils;

function constructConditionalTransactionData(nonceUniqueId: number) {
  const salt = keccak256(
    cf.utils.abi.encodePacked(["uint256"], [nonceUniqueId])
  );
  const uninstallKey = keccak256(
    cf.utils.abi.encodePacked(
      ["address", "uint256", "uint256"],
      [TEST_MULTISIG_ADDRESS, 0, salt]
    )
  );

  const { terms } = TEST_FREE_BALANCE_APP_INSTANCE;
  return constructContractCall(
    "executeAppConditionalTransaction(address,address,bytes32,bytes32,tuple(uint8,uint256,address))",
    TEST_NETWORK_CONTEXT.registryAddr,
    TEST_NETWORK_CONTEXT.nonceRegistryAddr,
    uninstallKey,
    TEST_FREE_BALANCE_APP_INSTANCE.cfAddress(),
    [terms.assetType, terms.limit, terms.token]
  );
}

describe("OpSetup", () => {
  const TEST_NONCE_UNIQUE_ID = 1;
  let operation: OpSetup;

  beforeEach(() => {
    operation = new OpSetup(
      TEST_NETWORK_CONTEXT,
      TEST_MULTISIG_ADDRESS,
      TEST_FREE_BALANCE_APP_INSTANCE,
      TEST_FREE_BALANCE,
      new cf.legacy.utils.Nonce(true, TEST_NONCE_UNIQUE_ID, 0)
    );
  });

  // https://specs.counterfactual.com/04-setup-protocol#commitments
  it("Should be able to compute the correct tx to submit on-chain", () => {
    const conditionalTransactionData = constructConditionalTransactionData(
      TEST_NONCE_UNIQUE_ID
    );

    const digest = operation.hashToSign();
    const signatures = TEST_SIGNING_KEYS.map(key => key.signDigest(digest));
    const expectedTxData = constructMultisigExecTransaction(
      "delegatecall",
      TEST_NETWORK_CONTEXT.conditionalTransactionAddr,
      0,
      conditionalTransactionData,
      signatures
    );

    const tx = operation.transaction(signatures);
    expect(tx.to).toBe(TEST_MULTISIG_ADDRESS);
    expect(tx.value).toBe(0);
    expect(tx.data).toBe(expectedTxData);
  });
});
