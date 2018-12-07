import { AuthLogin } from "./auth-login";

describe("app", () => {
  it("builds", () => {
    expect(new AuthLogin()).toBeTruthy();
  });
});
