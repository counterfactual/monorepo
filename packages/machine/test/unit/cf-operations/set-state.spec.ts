import * as ethers from "ethers";

import * as abi from "../../../src/abi";
import { CfOpSetState } from "../../../src/middleware/cf-operation";
import { CfAppInstance } from "../../../src/middleware/cf-operation/types";
import { Signature } from "../../../src/utils";

import {
  TEST_APP_INTERFACE,
  TEST_APP_STATE_HASH,
  TEST_APP_UNIQUE_ID,
  TEST_LOCAL_NONCE,
  TEST_MULTISIG_ADDRESS,
  TEST_NETWORK_CONTEXT,
  TEST_PARTICIPANTS,
  TEST_SIGNING_KEYS,
  TEST_TERMS,
  TEST_TIMEOUT
} from "./test-data";

describe("CfOpSetState", () => {
  let op: CfOpSetState;

  beforeEach(() => {
    op = new CfOpSetState(
      TEST_NETWORK_CONTEXT,
      TEST_MULTISIG_ADDRESS,
      TEST_PARTICIPANTS,
      TEST_APP_STATE_HASH,
      TEST_APP_UNIQUE_ID,
      TEST_TERMS,
      TEST_APP_INTERFACE,
      TEST_LOCAL_NONCE,
      TEST_TIMEOUT
    );
  });

  it("Should be able to compute the correct tx to submit on-chain", () => {
    const digest = op.hashToSign();
    const vra1 = TEST_SIGNING_KEYS[0].signDigest(digest);
    const vra2 = TEST_SIGNING_KEYS[1].signDigest(digest);
    const sig1 = new Signature(vra1.recoveryParam as number, vra1.r, vra1.s);
    const sig2 = new Signature(vra2.recoveryParam as number, vra2.r, vra2.s);

    const tx = op.transaction([sig1, sig2]);

    const app = new CfAppInstance(
      TEST_NETWORK_CONTEXT,
      TEST_MULTISIG_ADDRESS,
      TEST_PARTICIPANTS,
      TEST_APP_INTERFACE,
      TEST_TERMS,
      TEST_TIMEOUT,
      TEST_APP_UNIQUE_ID
    );

    expect(tx.to).toBe(TEST_NETWORK_CONTEXT.registryAddr);
    expect(tx.value).toBe(0);
    expect(tx.data).toBe(
      new ethers.utils.Interface([
        "proxyCall(address,bytes32,bytes)"
      ]).functions.proxyCall.encode([
        TEST_NETWORK_CONTEXT.registryAddr,
        app.cfAddress(),
        new ethers.utils.Interface([
          "setState(bytes32,uint256,uint256,bytes)"
        ]).functions.setState.encode([
          TEST_APP_STATE_HASH,
          TEST_LOCAL_NONCE,
          TEST_TIMEOUT,
          `0x${sig1.toString().substr(2)}${sig2.toString().substr(2)}`
        ])
      ])
    );
  });

  // https://github.com/counterfactual/specs/blob/master/v0/protocols.md#digest
  it("Should compute the correct hash to sign", () => {
    expect(op.hashToSign()).toBe(
      ethers.utils.keccak256(
        abi.encodePacked(
          ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
          [
            "0x19",
            TEST_PARTICIPANTS,
            TEST_LOCAL_NONCE,
            TEST_TIMEOUT,
            TEST_APP_STATE_HASH
          ]
        )
      )
    );
  });
});
