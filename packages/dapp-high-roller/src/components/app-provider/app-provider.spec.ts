import { AppProvider } from "./app-provider";

describe("app-provider", () => {
  it("builds", () => {
    expect(new AppProvider()).toBeTruthy();
  });
});
