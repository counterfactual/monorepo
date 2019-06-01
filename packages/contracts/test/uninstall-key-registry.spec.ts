import * as waffle from "ethereum-waffle";
import { Contract, ethers } from "ethers";

import UninstallKeyRegistry from "../build/UninstallKeyRegistry.json";

import { expect } from "./utils";

const { HashZero } = ethers.constants;
const { solidityKeccak256 } = ethers.utils;

describe("UninstallKeyRegistry", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;

  let uninstallKeyRegistry: Contract;

  const computeKey = (sender: string, salt: string) =>
    solidityKeccak256(["address", "bytes32"], [sender, salt]);

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    uninstallKeyRegistry = await waffle.deployContract(
      wallet,
      UninstallKeyRegistry
    );
  });

  it("can set a key as uninstalled", async () => {
    const salt = HashZero;

    await uninstallKeyRegistry.functions.setKeyAsUninstalled(salt);

    const ret = await uninstallKeyRegistry.functions.uninstalledKeys(
      computeKey(wallet.address, salt)
    );

    expect(ret).to.eq(true);
  });

  it("fails if key was already set as uninstalled", async () => {
    const salt = HashZero;

    const setKeyAsUninstalled =
      uninstallKeyRegistry.functions.setKeyAsUninstalled;

    await expect(setKeyAsUninstalled(salt)).to.be.revertedWith(
      "Key has already been set as uninstalled."
    );
  });
});
