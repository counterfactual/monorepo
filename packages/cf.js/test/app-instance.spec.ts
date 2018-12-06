import ETHBalanceRefundApp from "@counterfactual/apps/build/ETHBalanceRefundApp.json";

import { AppInstance } from "../src/legacy/app-instance";

describe("AppInstance", async () => {
  it("generateAbiEncodings correctly generates a appStateEncoding and appActionEncoding", () => {
    const abiEncodings = AppInstance.generateAbiEncodings(
      ETHBalanceRefundApp.interface
    );

    expect(abiEncodings.appStateEncoding).toEqual(
      "tuple(address,address,uint256)"
    );
    expect(abiEncodings.appActionEncoding).toEqual(
      '["resolve(tuple(address,address,uint256),tuple(uint8,uint256,address))"]'
    );
  });
});
