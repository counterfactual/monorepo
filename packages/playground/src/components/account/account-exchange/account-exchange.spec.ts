import { AccountExchange } from "./account-exchange";

describe("app", () => {
  it("builds", () => {
    expect(new AccountExchange()).toBeTruthy();
  });
});
