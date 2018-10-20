import * as Utils from "@counterfactual/dev-utils";
import * as ethers from "ethers";
import { AbstractContract, expect } from "../../utils";

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

contract("NonceRegistry", accounts => {
  let registry: ethers.Contract;

  const computeKey = (timeout: ethers.utils.BigNumber, salt: string) =>
    ethers.utils.solidityKeccak256(
      ["address", "uint256", "bytes32"],
      [accounts[0], timeout, salt]
    );

  // @ts-ignore
  before(async () => {
    const NonceRegistry = await AbstractContract.loadBuildArtifact(
      "NonceRegistry"
    );
    registry = await NonceRegistry.deploy(unlockedAccount);
  });

  it("getFirstNBits works for 8", async () => {
    const ret = await registry.functions.getFirstNBits(
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      8
    );
    expect(ret).to.be.eql(
      new ethers.utils.BigNumber(
        "0xff00000000000000000000000000000000000000000000000000000000000000"
      )
    );
  });

  it("getFirstNBits works for 9", async () => {
    const ret = await registry.functions.getFirstNBits(
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      9
    );
    // 0x8 == 0b1000
    expect(ret).to.be.eql(
      new ethers.utils.BigNumber(
        "0xff80000000000000000000000000000000000000000000000000000000000000"
      )
    );
  });

  it("can set nonces", async () => {
    const timeout = new ethers.utils.BigNumber(10);
    await registry.functions.setNonce(timeout, Utils.ZERO_BYTES32, 1);
    const ret = await registry.functions.table(
      computeKey(timeout, Utils.ZERO_BYTES32)
    );
    expect(ret.nonceValue).to.be.eql(new ethers.utils.BigNumber(1));
    expect(ret.finalizesAt).to.be.eql(
      new ethers.utils.BigNumber((await provider.getBlockNumber()) + 10)
    );
  });

  it("fails if nonce increment is not positive", async () => {
    await Utils.assertRejects(
      registry.functions.setNonce(
        new ethers.utils.BigNumber(10),
        Utils.ZERO_BYTES32,
        0
      )
    );
  });

  it("can insta-finalize nonces", async () => {
    const timeout = new ethers.utils.BigNumber(0);
    const nonceValue = new ethers.utils.BigNumber(1);
    const nonceKey = computeKey(timeout, Utils.ZERO_BYTES32);

    await registry.functions.setNonce(timeout, Utils.ZERO_BYTES32, nonceValue);
    const ret = await registry.functions.table(nonceKey);
    expect(ret.nonceValue).to.be.eql(new ethers.utils.BigNumber(nonceValue));
    expect(ret.finalizesAt).to.be.eql(
      new ethers.utils.BigNumber(await provider.getBlockNumber())
    );
    const isFinal = await registry.functions.isFinalized(
      computeKey(timeout, Utils.ZERO_BYTES32),
      nonceValue
    );
    expect(isFinal).to.be.eql(true);
  });
});
