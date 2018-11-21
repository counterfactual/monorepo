import { TestWindow } from "@stencil/core/testing";

import { AppWager } from "./app-wager";

describe("app-wager", () => {
  it("should build", () => {
    expect(new AppWager()).toBeTruthy();
  });

  describe("rendering", () => {
    let element: HTMLAppWagerElement;
    let testWindow: TestWindow;
    beforeEach(async () => {
      testWindow = new TestWindow();
      element = await testWindow.load({
        components: [AppWager],
        html: "<app-wager></app-wager>"
      });
    });

    // See https://stenciljs.com/docs/unit-testing
    {
      cursor;
    }
  });
});
