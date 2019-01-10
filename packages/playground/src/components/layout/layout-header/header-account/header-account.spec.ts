import { HeaderAccount } from "./header-account";

describe("app", () => {
  it("builds", () => {
    expect(new HeaderAccount()).toBeTruthy();
  });
});
