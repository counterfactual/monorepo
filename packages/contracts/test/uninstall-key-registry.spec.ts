import * as waffle from "ethereum-waffle";
import { Contract, ethers } from "ethers";

import UninstallKeyRegistry from "../build/UninstallKeyRegistry.json";

import { expect } from "./utils";

const { HashZero, Zero, One } = ethers.constants;
const { solidityKeccak256, bigNumberify } = ethers.utils;

describe("UninstallKeyRegistry", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;

  let uninstallKeyRegistry: Contract;

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

    uninstallKeyRegistry = await waffle.deployContract(
      wallet,
      UninstallKeyRegistry
    );
  });

  it("can set nonces", async () => {
    const timeout = bigNumberify(10);
    const salt = HashZero;

    await uninstallKeyRegistry.functions.setKeyAsUninstalled(timeout, salt);

    const ret = await uninstallKeyRegistry.functions.table(
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

    const setKeyAsUninstalled = uninstallKeyRegistry.functions.setKeyAsUninstalled;

    // @ts-ignore
    await expect(setKeyAsUninstalled(timeout, salt, value)).to.be.reverted;
  });

  it("can insta-finalize nonces", async () => {
    const timeout = Zero;
    const salt = HashZero;
    const key = computeKey(wallet.address, timeout, salt);

    await uninstallKeyRegistry.functions.setKeyAsUninstalled(timeout, salt);

    const ret = await uninstallKeyRegistry.functions.table(key);
    const isFinal = await uninstallKeyRegistry.functions.isDefinitelyUninstalledOrHasNotBeenSet(
      key
    );
    const blockNumber = bigNumberify(await provider.getBlockNumber());

    expect(ret.nonceValue).to.eq(true);
    expect(ret.finalizesAt).to.eq(blockNumber);
    expect(isFinal).to.be.true;
  });
});
