import { AccountEthForm } from "./account-eth-form";

describe("app", () => {
  it("builds", () => {
    expect(new AccountEthForm()).toBeTruthy();
  });
});
