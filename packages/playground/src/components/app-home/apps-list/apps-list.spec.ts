import { AppsList } from "./apps-list";

describe("app", () => {
  it("builds", () => {
    expect(new AppsList()).toBeTruthy();
  });
});
