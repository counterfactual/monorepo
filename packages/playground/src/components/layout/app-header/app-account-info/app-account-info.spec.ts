import { AppAccountInfo } from "./app-account-info";

describe("app", () => {
  it("builds", () => {
    expect(new AppAccountInfo()).toBeTruthy();
  });
});
