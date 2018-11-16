import { ethers } from "ethers";

import { FreeBalance } from "../legacy/utils/free-balance";
import { Nonce } from "../legacy/utils/nonce";

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
