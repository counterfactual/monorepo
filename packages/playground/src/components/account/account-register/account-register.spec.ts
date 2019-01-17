import { AccountRegister } from "./account-register";

describe.skip("app", () => {
  // TODO: This test should mock the node singleton.
  it("builds", async () => {
    expect(new AccountRegister()).toBeTruthy();
  });
});
