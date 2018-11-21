import { newE2EPage } from "@stencil/core/testing";

import { AppWager } from "./app-wager";

describe("app-wager", () => {
  it("should build", () => {
    expect(new AppWager()).toBeTruthy();
  });

  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-wager></app-wager>");

    const element = await page.find("app-wager");
    expect(element).toHaveClass("hydrated");
  });
});
