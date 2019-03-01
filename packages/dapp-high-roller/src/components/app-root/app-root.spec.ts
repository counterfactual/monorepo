import { AppRoot } from "./app-root";

describe("app-root", () => {
  it("builds", () => {
    window["addEventListener"] = jest.fn();
    expect(new AppRoot()).toBeTruthy();
  });
});
