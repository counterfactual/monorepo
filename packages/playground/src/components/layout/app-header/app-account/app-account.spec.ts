import { AppAccount } from "./app-account";

describe("app", () => {
  it("builds", () => {
    expect(new AppAccount()).toBeTruthy();
  });
});
