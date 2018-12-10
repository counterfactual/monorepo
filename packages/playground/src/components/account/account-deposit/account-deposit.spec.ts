import { AccountDeposit } from "./account-deposit";

describe("app", () => {
  it("builds", () => {
    expect(new AccountDeposit()).toBeTruthy();
  });
});
