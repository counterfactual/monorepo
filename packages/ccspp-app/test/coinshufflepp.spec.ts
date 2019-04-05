import chai from "chai";
import * as waffle from "ethereum-waffle";
import { ethers } from "ethers";

import ChannelizedCoinShufflePlusApp from "../build/ChannelizedCoinShufflePlusApp.json";
import LibNibble from "../build/LibNibble.json";

chai.use(waffle.solidity);
const { expect } = chai;

describe("ChannelizedCoinShuffleApp Contract", () => {
  const provider: ethers.providers.Web3Provider = waffle.createMockProvider();
  const wallet: ethers.Wallet = waffle.getWallets(provider)[0];
  let shuffler: ethers.Contract;
  let libnibble: ethers.Contract;

  before(async () => {
    libnibble = await waffle.deployContract(wallet, LibNibble);
    waffle.link(
      ChannelizedCoinShufflePlusApp,
      "contracts/lib/LibNibble.sol:LibNibble",
      libnibble.address
    );
    shuffler = await waffle.deployContract(
      wallet,
      ChannelizedCoinShufflePlusApp,
      [],
      {
        gasPrice: 30000000000,
        gasLimit: 6000000
      }
    );
  });

  it("placeholder", async () => {
    expect(1).to.eq(1);
  });
});
