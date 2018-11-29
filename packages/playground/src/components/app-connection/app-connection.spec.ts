import { AppConnection } from "./app-connection";

describe("app", () => {
  it("builds", () => {
    expect(new AppConnection()).toBeTruthy();
  });
});
