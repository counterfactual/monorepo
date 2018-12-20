// import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import { Wallet } from "ethers";
import { AddressZero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import {
  bigNumberify,
  getAddress,
  hexlify,
  // Interface,
  // keccak256,
  randomBytes
  // solidityPack,
  // TransactionDescription
} from "ethers/utils";

import { SetStateCommitment } from "../../../src/ethereum";
// import { appIdentityToHash } from "../../../src/ethereum/utils/app-identity";
import { Transaction } from "../../../src/ethereum/utils/types";
import { AppInstance } from "../../../src/models";

require("dotenv").config();

const ganacheHost = process.env.DEV_GANACHE_HOST || "127.0.0.1";
const ganachePort = process.env.DEV_GANACHE_PORT || "8546";

/**
 * This test suite tests submitting a generated Set State Commitment
 * to the blockchain and observing the result
 */
describe("Set State Commitment Submitted to Blockchain", () => {
  let commitment: SetStateCommitment;
  let tx: Transaction;

  // Test network context
  const networkContext: NetworkContext = {
    ETHBucket: getAddress(hexlify(randomBytes(20))),
    StateChannelTransaction: getAddress(hexlify(randomBytes(20))),
    MultiSend: getAddress(hexlify(randomBytes(20))),
    NonceRegistry: getAddress(hexlify(randomBytes(20))),
    AppRegistry: getAddress(hexlify(randomBytes(20))),
    ETHBalanceRefund: getAddress(hexlify(randomBytes(20)))
  };

  const app = new AppInstance(
    getAddress(hexlify(randomBytes(20))),
    [
      getAddress(hexlify(randomBytes(20))),
      getAddress(hexlify(randomBytes(20)))
    ],
    Math.ceil(1000 * Math.random()),
    {
      addr: getAddress(hexlify(randomBytes(20))),
      applyAction: hexlify(randomBytes(4)),
      resolve: hexlify(randomBytes(4)),
      isStateTerminal: hexlify(randomBytes(4)),
      getTurnTaker: hexlify(randomBytes(4)),
      stateEncoding: "tuple(address foo, uint256 bar)",
      actionEncoding: undefined
    },
    {
      assetType: AssetType.ETH,
      limit: bigNumberify(2),
      token: AddressZero
    },
    false,
    Math.ceil(1000 * Math.random()),
    { foo: AddressZero, bar: 0 },
    0,
    Math.ceil(1000 * Math.random())
  );

  beforeAll(() => {
    commitment = new SetStateCommitment(
      networkContext,
      app.identity,
      app.encodedLatestState,
      app.nonce,
      app.timeout
    );

    tx = commitment.transaction([
      /* NOTE: Passing in no signatures for test only */
    ]);
  });

  it("should not fail", async () => {
    const provider = new JsonRpcProvider(
      `http://${ganacheHost}:${ganachePort}`
    );
    console.log(provider);
    console.log(tx);
    // console.log(x);
  });
});
