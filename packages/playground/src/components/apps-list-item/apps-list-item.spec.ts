import { AppsListItem } from "./apps-list-item";

describe("app", () => {
  it("builds", () => {
    expect(new AppsListItem()).toBeTruthy();
  });
});
