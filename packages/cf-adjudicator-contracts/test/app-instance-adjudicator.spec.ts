import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { HashZero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { defaultAbiCoder } from "ethers/utils";

import AppInstanceAdjudicator from "../build/AppInstanceAdjudicator.json";
import AppWithAction from "../build/AppWithAction.json";

describe("Force Move Game Rules", () => {
  let provider: Web3Provider;
  let wallet: Wallet;
  let adjudicator: Contract;
  let app: Contract;

  const ALICE =
    // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
    new Wallet(
      "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
    );

  const BOB =
    // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
    new Wallet(
      "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
    );

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];
    wallet2 = (await waffle.getWallets(provider))[1];

    adjudicator = await waffle.deployContract(
      wallet,
      AppInstanceAdjudicator,
      []
    );

    app = await waffle.deployContract(wallet, AppWithAction, []);
  });

  it("test", async () => {
    const appInstanceState = {
      appDefinition: app.address,
      participants: [ALICE, BOB],
      actionTaken: HashZero,
      appAttributes: HashZero,
      challengeTimeout: 100,
      nonce: 0,
      versionNum: 0,
      stateType: 0
    };

    await adjudicator.functions.challenge(
      {
        ...appInstanceState,
        versionNum: 0,
        actionTaken: defaultAbiCoder.encode(["tuple(uint256)"], [1])
      },
      {
        ...appInstanceState,
        versionNum: 1,
        actionTaken: defaultAbiCoder.encode([""])
      }
    );
  });
});
