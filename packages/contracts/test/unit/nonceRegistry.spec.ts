import * as ethers from "ethers";

import { NonceRegistry } from "../../types/ethers-contracts/NonceRegistry";


import { AbstractContract, expect } from "../../utils";
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

contract("NonceRegistry", accounts => {
  let nonceRegistry: NonceRegistry;

  const computeKey = (timeout: number, salt: string) =>
    ethers.utils.solidityKeccak256(
      ["address", "uint256", "bytes32"],
      [accounts[0], timeout, salt]
    );

  // @ts-ignore
  before(async () => {
    const contract = await AbstractContract.loadBuildArtifact("NonceRegistry");
    nonceRegistry = (await contract.deploy(unlockedAccount)) as NonceRegistry;
  });

  it("can set nonces", async () => {
    const timeout = 10;
    await nonceRegistry.functions.setNonce(
      timeout,
      ethers.constants.HashZero,
      1
    );
    const ret = await nonceRegistry.functions.table(
      computeKey(timeout, ethers.constants.HashZero)
    );
    expect(ret.nonceValue).to.be.eql(new ethers.utils.BigNumber(1));
    expect(ret.finalizesAt).to.be.eql(
      new ethers.utils.BigNumber((await provider.getBlockNumber()) + 10)
    );
  });

  it("fails if nonce increment is not positive", async () => {
    await Utils.assertRejects(
      nonceRegistry.functions.setNonce(10, ethers.constants.HashZero, 0)
    );
  });

  it("can insta-finalize nonces", async () => {
    const timeout = 0;
    const nonceValue = 1;
    const nonceKey = computeKey(timeout, ethers.constants.HashZero);

    await nonceRegistry.functions.setNonce(
      timeout,
      ethers.constants.HashZero,
      nonceValue
    );
    const ret = await nonceRegistry.functions.table(nonceKey);
    expect(ret.nonceValue).to.be.eql(new ethers.utils.BigNumber(nonceValue));
    expect(ret.finalizesAt).to.be.eql(
      new ethers.utils.BigNumber(await provider.getBlockNumber())
    );
    const isFinal = await nonceRegistry.functions.isFinalized(
      computeKey(timeout, ethers.constants.HashZero),
      nonceValue
    );
    expect(isFinal).to.be.eql(true);
  });
});
