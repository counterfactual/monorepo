import chai from "chai";
import * as waffle from "ethereum-waffle";
import { ethers } from "ethers";

import PaymentApp from "../build/PaymentApp.json";

chai.use(waffle.solidity);

const { expect } = chai;
const { AddressZero, WeiPerEther } = ethers.constants;

const [A, B] = [
  "0xb37e49bFC97A948617bF3B63BC6942BB15285715",
  "0xaeF082d339D227646DB914f0cA9fF02c8544F30b"
];

describe("PaymentApp", () => {
  let pc: ethers.Contract;

  before(async () => {
    const provider: ethers.providers.Web3Provider = waffle.createMockProvider();
    const wallet: ethers.Wallet = (await waffle.getWallets(provider))[0];
    pc = await waffle.deployContract(wallet, PaymentApp);
  });

  it("should resolve to payments", async () => {
    const ret = await pc.functions.resolve(
      {
        alice: A,
        bob: B,
        aliceBalance: WeiPerEther,
        bobBalance: WeiPerEther
      },
      {
        assetType: 0,
        limit: WeiPerEther.mul(2),
        token: AddressZero
      }
    );
    expect(ret.assetType).to.eq(0);
    expect(ret.token).to.eq(ethers.constants.AddressZero);
    expect(ret.to[0]).to.eq(A);
    expect(ret.to[1]).to.eq(B);
    expect(ret.value[0]).to.eq(WeiPerEther);
    expect(ret.value[1]).to.eq(WeiPerEther);
  });
});
