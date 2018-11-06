import * as cf from "@counterfactual/cf.js";
import * as ethers from "ethers";

import { CfOpSetup } from "../../../src/middleware/cf-operation";

import {
  TEST_FREE_BALANCE,
  TEST_FREE_BALANCE_APP_INSTANCE,
  TEST_MULTISIG_ADDRESS,
  TEST_NETWORK_CONTEXT,
  TEST_SIGNING_KEYS
} from "./test-data";

const { keccak256 } = ethers.utils;

describe("CfOpSetup", () => {
  const TEST_NONCE_UNIQUE_ID = 1;
  let op: CfOpSetup;

  beforeEach(() => {
    op = new CfOpSetup(
      TEST_NETWORK_CONTEXT,
      TEST_MULTISIG_ADDRESS,
      TEST_FREE_BALANCE_APP_INSTANCE,
      TEST_FREE_BALANCE,
      new cf.utils.CfNonce(true, TEST_NONCE_UNIQUE_ID, 2)
    );
  });

  it("Should be able to compute the correct tx to submit on-chain", () => {
    const digest = op.hashToSign();
    const vra1 = TEST_SIGNING_KEYS[0].signDigest(digest);
    const vra2 = TEST_SIGNING_KEYS[1].signDigest(digest);
    const sig1 = new cf.utils.Signature(
      vra1.recoveryParam as number,
      vra1.r,
      vra1.s
    );
    const sig2 = new cf.utils.Signature(
      vra2.recoveryParam as number,
      vra2.r,
      vra2.s
    );

    const tx = op.transaction([sig1, sig2]);
    const salt = keccak256(
      cf.utils.abi.encodePacked(["uint256"], [TEST_NONCE_UNIQUE_ID])
    );
    const uninstallKey = keccak256(
      cf.utils.abi.encodePacked(
        ["address", "uint256", "uint256"],
        [TEST_MULTISIG_ADDRESS, 0, salt]
      )
    );

    const { terms } = TEST_FREE_BALANCE_APP_INSTANCE;

    expect(tx.to).toBe(TEST_MULTISIG_ADDRESS);
    expect(tx.value).toBe(0);
    expect(tx.data).toBe(
      new ethers.utils.Interface([
        "execTransaction(address, uint256, bytes, uint8, bytes)"
      ]).functions.execTransaction.encode([
        TEST_NETWORK_CONTEXT.conditionalTransactionAddr,
        0,
        new ethers.utils.Interface([
          "executeAppConditionalTransaction(address,address,bytes32,bytes32,tuple(uint8,uint256,address))"
        ]).functions.executeAppConditionalTransaction.encode([
          TEST_NETWORK_CONTEXT.registryAddr,
          TEST_NETWORK_CONTEXT.nonceRegistryAddr,
          uninstallKey,
          TEST_FREE_BALANCE_APP_INSTANCE.cfAddress(),
          [terms.assetType, terms.limit, terms.token]
        ]),
        1,
        `0x${sig1.toString().substr(2)}${sig2.toString().substr(2)}`
      ])
    );
  });
});
