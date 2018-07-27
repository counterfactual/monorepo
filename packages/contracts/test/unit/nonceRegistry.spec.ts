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

  it("can set nonces", async () => {
    await registry.functions.setNonce(Utils.zeroBytes32, 1, Utils.highGasLimit);
    const ret = await registry.functions.table(computeKey(Utils.zeroBytes32));
    ret.nonce.should.be.bignumber.eq(1);
    ret.finalizesAt.should.be.bignumber.eq(
      (await provider.getBlockNumber()) + 10
    );
  });

  it("fails if nonce increment is not positive", async () => {
    await Utils.assertRejects(
      registry.functions.setNonce(Utils.zeroBytes32, 0, Utils.highGasLimit)
    );
  });

  it("can finalize nonces", async () => {
    await registry.functions.finalizeNonce(
      Utils.zeroBytes32,
      Utils.highGasLimit
    );
    const ret = await registry.functions.table(computeKey(Utils.zeroBytes32));
    ret.nonce.should.be.bignumber.eq(0);
    ret.finalizesAt.should.be.bignumber.eq(await provider.getBlockNumber());
    const isFinal = await registry.functions.isFinalizedAt(
      computeKey(Utils.zeroBytes32),
      0
    );
    isFinal.should.be.equal(true);
  });
});
