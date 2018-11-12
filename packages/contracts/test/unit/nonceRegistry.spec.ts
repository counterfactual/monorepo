import { ethers } from "ethers";

import { AbstractContract, expect } from "../../utils";
import * as Utils from "../../utils/misc";

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
    const nonceRegistry = await AbstractContract.fromArtifactName(
      "NonceRegistry"
    );
    registry = await nonceRegistry.deploy(unlockedAccount);
  });

  it("can set nonces", async () => {
    const timeout = new ethers.utils.BigNumber(10);
    await registry.functions.setNonce(timeout, ethers.constants.HashZero, 1);
    const ret = await registry.functions.table(
      computeKey(timeout, ethers.constants.HashZero)
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
        ethers.constants.HashZero,
        0
      )
    );
  });

  it("can insta-finalize nonces", async () => {
    const timeout = new ethers.utils.BigNumber(0);
    const nonceValue = new ethers.utils.BigNumber(1);
    const nonceKey = computeKey(timeout, ethers.constants.HashZero);

    await registry.functions.setNonce(
      timeout,
      ethers.constants.HashZero,
      nonceValue
    );
    const ret = await registry.functions.table(nonceKey);
    expect(ret.nonceValue).to.be.eql(new ethers.utils.BigNumber(nonceValue));
    expect(ret.finalizesAt).to.be.eql(
      new ethers.utils.BigNumber(await provider.getBlockNumber())
    );
    const isFinal = await registry.functions.isFinalized(
      computeKey(timeout, ethers.constants.HashZero),
      nonceValue
    );
    expect(isFinal).to.be.eql(true);
  });
});
