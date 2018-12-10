import { WidgetConnection } from "./widget-connection";

describe("app", () => {
  it("builds", () => {
    expect(new WidgetConnection()).toBeTruthy();
  });
});
