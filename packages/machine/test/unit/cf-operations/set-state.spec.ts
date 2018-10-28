import * as ethers from "ethers";

import * as abi from "../../../src/abi";
import { CfOpSetState } from "../../../src/middleware/cf-operation/cf-op-setstate";
import {
  CfAppInterface,
  CfStateChannel,
  Terms
} from "../../../src/middleware/cf-operation/types";

import { NetworkContext } from "../../../src/utils/network-context";
import { Signature } from "../../../src/utils/signature";

describe("CfOpSetState", () => {
  const TEST_NETWORK_CONTEXT = new NetworkContext(
    ethers.utils.hexlify(ethers.utils.randomBytes(20)),
    ethers.utils.hexlify(ethers.utils.randomBytes(20)),
    ethers.utils.hexlify(ethers.utils.randomBytes(20)),
    ethers.utils.hexlify(ethers.utils.randomBytes(20)),
    ethers.utils.hexlify(ethers.utils.randomBytes(20)),
    ethers.utils.hexlify(ethers.utils.randomBytes(20)),
    ethers.utils.hexlify(ethers.utils.randomBytes(20)),
    ethers.utils.hexlify(ethers.utils.randomBytes(20))
  );
  const TEST_MULTISIG_ADDRESS = ethers.utils.hexlify(
    ethers.utils.randomBytes(20)
  );
  const TEST_SIGNING_KEYS = [
    // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
    new ethers.utils.SigningKey(
      "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
    ),
    // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
    new ethers.utils.SigningKey(
      "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
    )
  ];
  const TEST_PARTICIPANTS = [
    TEST_SIGNING_KEYS[0].address,
    TEST_SIGNING_KEYS[1].address
  ];
  const TEST_APP_UNIQUE_ID = Math.floor(1000 * Math.random());
  const TEST_TERMS = new Terms(
    0,
    ethers.utils.bigNumberify(Math.floor(1000 * Math.random())),
    ethers.constants.AddressZero
  );
  const TEST_APP_INTERFACE = new CfAppInterface(
    ethers.constants.AddressZero,
    ethers.utils.hexlify(ethers.utils.randomBytes(4)),
    ethers.utils.hexlify(ethers.utils.randomBytes(4)),
    ethers.utils.hexlify(ethers.utils.randomBytes(4)),
    ethers.utils.hexlify(ethers.utils.randomBytes(4)),
    "tuple(address,uint256)"
  );
  const TEST_APP_STATE_HASH = ethers.utils.hexlify(
    ethers.utils.randomBytes(32)
  );
  const TEST_LOCAL_NONCE = Math.floor(1000 * Math.random());
  const TEST_TIMEOUT = Math.floor(1000 * Math.random());

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

    const app = new CfStateChannel(
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
