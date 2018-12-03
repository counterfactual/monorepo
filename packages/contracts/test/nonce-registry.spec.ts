import { ethers } from "ethers";

import { expect } from "./utils";

const { HashZero, Zero, One } = ethers.constants;
const { solidityKeccak256, bigNumberify } = ethers.utils;

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

contract("NonceRegistry", accounts => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;

  let nonceRegistry: ethers.Contract;

  const computeKey = (timeout: ethers.utils.BigNumber, salt: string) =>
    solidityKeccak256(
      ["address", "uint256", "bytes32"],
      [accounts[0], timeout, salt]
    );

  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    nonceRegistry = new ethers.Contract(
      artifacts.require("NonceRegistry").address,
      artifacts.require("NonceRegistry").abi,
      unlockedAccount
    );
  });

  it("can set nonces", async () => {
    const timeout = bigNumberify(10);
    const salt = HashZero;
    const value = One;

    await nonceRegistry.functions.setNonce(timeout, salt, value);

    const ret = await nonceRegistry.functions.table(computeKey(timeout, salt));
    const blockNumber = bigNumberify(await provider.getBlockNumber());

    expect(ret.nonceValue).to.eq(One);
    expect(ret.finalizesAt).to.eq(blockNumber.add(timeout));
  });

  it("fails if nonce increment is not positive", async () => {
    const timeout = 10;
    const salt = HashZero;
    const value = 0; // By default, all values are set to 0

    const setNonce = nonceRegistry.functions.setNonce;

    // @ts-ignore
    await expect(setNonce(timeout, salt, value)).to.be.reverted;
  });

  it("can insta-finalize nonces", async () => {
    const timeout = Zero;
    const salt = HashZero;
    const value = One;
    const key = computeKey(timeout, salt);

    await nonceRegistry.functions.setNonce(timeout, salt, value);

    const ret = await nonceRegistry.functions.table(key);
    const isFinal = await nonceRegistry.functions.isFinalized(key, value);
    const blockNumber = bigNumberify(await provider.getBlockNumber());

    expect(ret.nonceValue).to.eq(value);
    expect(ret.finalizesAt).to.eq(blockNumber);
    expect(isFinal).to.be.true;
  });
});
