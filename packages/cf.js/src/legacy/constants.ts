import { ethers } from "ethers";

import { NetworkContext } from "../legacy/network";
import { FreeBalance } from "../legacy/utils/free-balance";
import { Nonce } from "../legacy/utils/nonce";

// Arbitrary addresses
export const ADDRESS_A = "0xa03a8ea43999d1c45446f347b83d8985d48c91a9";
export const ADDRESS_B = "0xa03a8ea43999d1c45446f347b83d8985d48c91b0";

export const EMPTY_FREE_BALANCE = new FreeBalance(
  ethers.constants.AddressZero,
  ethers.utils.bigNumberify(0),
  ethers.constants.AddressZero,
  ethers.utils.bigNumberify(0),
  0,
  0,
  0,
  new Nonce(false, 0, 0)
);

export const EMPTY_NETWORK_CONTEXT = new NetworkContext(
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero,
  ethers.constants.AddressZero
);
