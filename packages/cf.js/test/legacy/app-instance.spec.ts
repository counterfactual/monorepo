import ETHBalanceRefundApp from "@counterfactual/contracts/build/contracts/ETHBalanceRefundApp.json";

import { generateAbiEncodings } from "../../src/utils";

describe("AppInstance", async () => {
  it("generateAbiEncodings correctly generates a appStateEncoding and appActionEncoding", () => {
    const abiEncodings = generateAbiEncodings(ETHBalanceRefundApp.abi);

    expect(abiEncodings.appStateEncoding).toEqual(
      "tuple(address,address,uint256)"
    );
    expect(abiEncodings.appActionEncoding).toEqual(
      '["resolve(tuple(address,address,uint256),tuple(uint8,uint256,address))"]'
    );
  });
});
