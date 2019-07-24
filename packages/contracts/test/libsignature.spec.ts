import { utils } from "@counterfactual/cf.js";
import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { HashZero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { SigningKey } from "ethers/utils";

import LibSignature from "../build/LibSignature.json";

import { expect } from "./utils";
const { signaturesToBytes } = utils;

const signingKey = new SigningKey(
  "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
);

describe("LibSignature", () => {
  let provider: Web3Provider;
  let wallet: Wallet;

  let libSig: Contract;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    libSig = await waffle.deployContract(wallet, LibSignature);
  });

  it("can recover signatures", async () => {
    const thingToSign = HashZero;
    const signature = await signingKey.signDigest(thingToSign);
    const bytes = signaturesToBytes(signature);

    const recovered = await libSig.recoverKey(bytes, thingToSign, 0);

    expect(recovered).to.be.eq(signingKey.address);
  });
});
