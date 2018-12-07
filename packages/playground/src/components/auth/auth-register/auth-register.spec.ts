import { AuthRegister } from "./auth-register";

describe("app", () => {
  it("builds", () => {
    expect(new AuthRegister()).toBeTruthy();
  });
});
