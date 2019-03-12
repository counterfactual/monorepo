import { AppRoot } from "./app-root";

describe.skip("app-root", () => {
  it("builds", () => {
    expect(new AppRoot()).toBeTruthy();
  });
});
