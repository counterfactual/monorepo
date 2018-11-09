import * as cf from "@counterfactual/cf.js";
import * as ethers from "ethers";

import { OpSetState } from "../../../src/middleware/protocol-operation";

import {
  contractCall,
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
} from "./fixture";

describe("OpSetState", () => {
  let operation: OpSetState;

  beforeEach(() => {
    operation = new OpSetState(
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
    const digest = operation.hashToSign();
    const [sig1, sig2] = TEST_SIGNING_KEYS.map(key => key.signDigest(digest));

    const app = new cf.app.AppInstance(
      TEST_NETWORK_CONTEXT,
      TEST_MULTISIG_ADDRESS,
      TEST_PARTICIPANTS,
      TEST_APP_INTERFACE,
      TEST_TERMS,
      TEST_TIMEOUT,
      TEST_APP_UNIQUE_ID
    );

    const tx = operation.transaction([sig1, sig2]);
    expect(tx.to).toBe(TEST_NETWORK_CONTEXT.registryAddr);
    expect(tx.value).toBe(0);
    expect(tx.data).toBe(
      contractCall("proxyCall(address,bytes32,bytes)")(
        TEST_NETWORK_CONTEXT.registryAddr,
        app.cfAddress(),
        contractCall("setState(bytes32,uint256,uint256,bytes)")(
          TEST_APP_STATE_HASH,
          TEST_LOCAL_NONCE,
          TEST_TIMEOUT,
          cf.utils.signaturesToSortedBytes(digest, sig1, sig2)
        )
      )
    );
  });

  // https://specs.counterfactual.com/06-update-protocol#commitments
  it("Should compute the correct hash to sign", () => {
    expect(operation.hashToSign()).toBe(
      ethers.utils.keccak256(
        cf.utils.abi.encodePacked(
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
