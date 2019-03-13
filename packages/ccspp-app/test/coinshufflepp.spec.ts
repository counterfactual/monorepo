import { SolidityABIEncoderV2Struct, Terms } from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";

import CoinShufflePlusApp from
"../build/ChannelizedCoinShufflePlusApp.json";

chai.use(waffle.solidity);
const {expect} = chai;

describe("ChannelizedCoinShufflePlusApp", () => {
  before(async ()=> {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
  })
});
