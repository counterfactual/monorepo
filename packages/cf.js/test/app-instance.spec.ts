import * as ETHBalanceRefundAppContract from "@counterfactual/contracts/build/contracts/ETHBalanceRefundApp.json";

import { AppInstance } from "../src/legacy/app-instance";

describe("AppInstance", async () => {
  it("generateAbiEncodings correctly generates a appStateEncoding and appActionEncoding", () => {
    const abiEncodings = AppInstance.generateAbiEncodings(
      ETHBalanceRefundAppContract.abi
    );

    expect(abiEncodings.appStateEncoding).toEqual(
      "tuple(address,address,uint256)"
    );
    expect(abiEncodings.appActionEncoding).toEqual(
      '["resolve(tuple(address,address,uint256),tuple(uint8,uint256,address))"]'
    );
  });
});
