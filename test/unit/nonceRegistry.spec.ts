import * as ethers from "ethers";

import * as Utils from "@counterfactual/test-utils";

const NonceRegistry = artifacts.require("NonceRegistry");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

contract("NonceRegistry", accounts => {
  let registry: ethers.Contract;

  const computeKey = (salt: string) =>
    ethers.utils.solidityKeccak256(["address", "bytes32"], [accounts[0], salt]);

  beforeEach(async () => {
    registry = await Utils.deployContract(NonceRegistry, unlockedAccount);
  });

  it("getFirstNBits works for 8", async () => {
    const ret = await registry.functions.getFirstNBits(
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      8
    );
    ret.should.be.bignumber.eq(
      "0xff00000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("getFirstNBits works for 9", async () => {
    const ret = await registry.functions.getFirstNBits(
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      9
    );
    // 0x8 == 0b1000
    ret.should.be.bignumber.eq(
      "0xff80000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("can set nonces", async () => {
    await registry.functions.setNonce(Utils.ZERO_BYTES32, 1);
    const ret = await registry.functions.table(computeKey(Utils.ZERO_BYTES32));
    ret.nonce.should.be.bignumber.eq(1);
    ret.finalizesAt.should.be.bignumber.eq(
      (await provider.getBlockNumber()) + 10
    );
  });

  it("fails if nonce increment is not positive", async () => {
    await Utils.assertRejects(
      registry.functions.setNonce(Utils.ZERO_BYTES32, 0)
    );
  });

  it("can finalize nonces", async () => {
    await registry.functions.finalizeNonce(Utils.ZERO_BYTES32);
    const ret = await registry.functions.table(computeKey(Utils.ZERO_BYTES32));
    ret.nonce.should.be.bignumber.eq(0);
    ret.finalizesAt.should.be.bignumber.eq(await provider.getBlockNumber());
    const isFinal = await registry.functions.isFinalized(
      computeKey(Utils.ZERO_BYTES32),
      0
    );
    isFinal.should.be.equal(true);
  });
});
