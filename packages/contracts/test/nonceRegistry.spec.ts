import { ethers } from "ethers";

import { expect } from "../utils";
import { assertRejects } from "../utils/misc";

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

  // @ts-ignore
  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    const nonceRegistryArtifact = artifacts.require("NonceRegistry");

    nonceRegistry = new ethers.Contract(
      (await nonceRegistryArtifact.new()).address,
      nonceRegistryArtifact.abi,
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

    expect(ret.nonceValue).to.be.eql(One);
    expect(ret.finalizesAt).to.be.eql(blockNumber.add(timeout));
  });

  it("fails if nonce increment is not positive", async () => {
    const timeout = bigNumberify(10);
    const salt = HashZero;
    const value = Zero; // By default, all values are set to 0

    await assertRejects(nonceRegistry.functions.setNonce(timeout, salt, value));
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

    expect(ret.nonceValue).to.be.eql(value);
    expect(ret.finalizesAt).to.be.eql(blockNumber);
    expect(isFinal).to.be.true;
  });
});
