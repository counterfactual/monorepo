import chai from "chai";
import * as waffle from "ethereum-waffle";
import { ethers } from "ethers";

import ChannelizedCoinShufflePlusApp from "../build/ChannelizedCoinShufflePlusApp.json";

chai.use(waffle.solidity);
const { expect } = chai;

describe("Curve25519 Contract", () => {
  const provider: ethers.providers.Web3Provider = waffle.createMockProvider();
  const wallet: ethers.Wallet = waffle.getWallets(provider)[0];
  let shuffler: ethers.Contract;

  before(async () => {
    shuffler = await waffle.deployContract(
      wallet,
      ChannelizedCoinShufflePlusApp
    );
  });

  it("placeholder", async () => {
    expect(1).to.eq(1);
  });
});
