import * as cf from "@counterfactual/cf.js";
import * as ethers from "ethers";

export const TEST_NETWORK_CONTEXT = new cf.utils.NetworkContext(
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
  "0x4444444444444444444444444444444444444444",
  "0x5555555555555555555555555555555555555555",
  "0x6666666666666666666666666666666666666666",
  "0x7777777777777777777777777777777777777777",
  "0x8888888888888888888888888888888888888888"
);
export const TEST_MULTISIG_ADDRESS = ethers.utils.hexlify(
  "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"
);
export const TEST_SIGNING_KEYS = [
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new ethers.utils.SigningKey(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
  ),
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new ethers.utils.SigningKey(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
  )
];
export const TEST_PARTICIPANTS = [
  TEST_SIGNING_KEYS[0].address,
  TEST_SIGNING_KEYS[1].address
];
export const TEST_APP_UNIQUE_ID = 13;
export const TEST_TERMS = new cf.app.Terms(
  0,
  ethers.utils.parseEther("1.0"),
  ethers.constants.AddressZero
);
export const TEST_APP_INTERFACE = new cf.app.CfAppInterface(
  ethers.constants.AddressZero,
  "0x00000000",
  "0x00000000",
  "0x00000000",
  "0x00000000",
  "tuple(address,uint256)"
);
export const TEST_APP_STATE_HASH = ethers.utils.hexlify(
  "0x9999999999999999999999999999999999999999999999999999999999999999"
);
export const TEST_LOCAL_NONCE = 0;
export const TEST_TIMEOUT = 100;

export const TEST_FREE_BALANCE_APP_INSTANCE = new cf.app.CfAppInstance(
  TEST_NETWORK_CONTEXT,
  TEST_MULTISIG_ADDRESS,
  TEST_PARTICIPANTS,
  TEST_APP_INTERFACE,
  TEST_TERMS,
  TEST_TIMEOUT,
  0
);

export const TEST_FREE_BALANCE = new cf.utils.CfFreeBalance(
  TEST_SIGNING_KEYS[0].address,
  ethers.utils.parseEther("0.5"),
  TEST_SIGNING_KEYS[1].address,
  ethers.utils.parseEther("0.5"),
  0,
  10,
  100,
  new cf.utils.CfNonce(true, 0, 5)
);
