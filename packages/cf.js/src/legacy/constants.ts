import { ethers } from "ethers";

import { FreeBalance, Nonce } from "./utils";

// Placeholder for constants used in various places
export const A_ADDRESS: string = "0x29930C4BC7815dE5Bcdcd0D4eAcB981B7a1F8FaF";
export const B_ADDRESS: string = "0xcdd871906E7689aef3817107C34c039614512a85";
export const C_ADDRESS: string = "0xBe3bE39F3F6994c68ab18Dbe0939401Cb8C861fc";

export const EMPTY_FREE_BALANCE = new FreeBalance(
  A_ADDRESS,
  ethers.utils.bigNumberify("0"),
  B_ADDRESS,
  ethers.utils.bigNumberify("0"),
  0,
  0,
  0,
  new Nonce(false, 0, 0)
);
