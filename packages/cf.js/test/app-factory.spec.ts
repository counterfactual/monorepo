import * as ethers from "ethers";

import { Provider } from "../src/provider";

import { TestNodeProvider } from "./fixture";

describe("App Factory", async () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
  });

  it("should instantiate", () => {
    provider.createAppFactory({
      address: ethers.constants.AddressZero,
      appActionEncoding: "tuple(uint256)",
      appStateEncoding: "tuple(uint256)"
    });
  });


});
