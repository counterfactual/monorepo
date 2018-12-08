import { AccountRegister } from "./account-register";

describe("app", () => {
  it("builds", () => {
    expect(new AccountRegister()).toBeTruthy();
  });
});
