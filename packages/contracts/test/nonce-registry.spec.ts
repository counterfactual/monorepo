import * as waffle from "ethereum-waffle";
import { Contract, ethers } from "ethers";

import RootNonceRegistry from "../build/RootNonceRegistry.json";

import { expect } from "./utils";

const { HashZero, Zero, One } = ethers.constants;
const { solidityKeccak256, bigNumberify } = ethers.utils;

describe("RootNonceRegistry", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;

  let rootNonceRegistry: Contract;

  const computeKey = (
    sender: string,
    timeout: ethers.utils.BigNumber,
    salt: string
  ) =>
    solidityKeccak256(
      ["address", "uint256", "bytes32"],
      [sender, timeout, salt]
    );

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    rootNonceRegistry = await waffle.deployContract(wallet, RootNonceRegistry);
  });

  it("can set nonces", async () => {
    const timeout = bigNumberify(10);
    const salt = HashZero;
    const value = One;

    await rootNonceRegistry.functions.setNonce(timeout, salt, value);

    const ret = await rootNonceRegistry.functions.table(
      computeKey(wallet.address, timeout, salt)
    );
    const blockNumber = bigNumberify(await provider.getBlockNumber());

    expect(ret.nonceValue).to.eq(One);
    expect(ret.finalizesAt).to.eq(blockNumber.add(timeout));
  });

  it("fails if nonce increment is not positive", async () => {
    const timeout = 10;
    const salt = HashZero;
    const value = 0; // By default, all values are set to 0

    const setNonce = rootNonceRegistry.functions.setNonce;

    // @ts-ignore
    await expect(setNonce(timeout, salt, value)).to.be.reverted;
  });

  it("can insta-finalize nonces", async () => {
    const timeout = Zero;
    const salt = HashZero;
    const value = One;
    const key = computeKey(wallet.address, timeout, salt);

    await rootNonceRegistry.functions.setNonce(timeout, salt, value);

    const ret = await rootNonceRegistry.functions.table(key);
    const isFinal = await rootNonceRegistry.functions.isFinalizedOrHasNeverBeenSetBefore(
      key,
      value
    );
    const blockNumber = bigNumberify(await provider.getBlockNumber());

    expect(ret.nonceValue).to.eq(value);
    expect(ret.finalizesAt).to.eq(blockNumber);
    expect(isFinal).to.be.true;
  });
});
