import { defaultAbiCoder } from "ethers/utils";

import { MultisigTransaction } from "./types";

const ENCODING = ["uint256", "address", "uint256", "bytes"];

export const encodeTransactions = (txs: MultisigTransaction[]) =>
  txs
    .map(x =>
      defaultAbiCoder.encode(ENCODING, [x.operation, x.to, x.value, x.data])
    )
    .reduce((acc, v) => acc + v.substr(2), "0x");
