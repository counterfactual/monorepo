import { newE2EPage } from "@stencil/core/testing";

import { AppLogo } from "./app-logo";

describe("app-logo", () => {
  it("should build", () => {
    expect(new AppLogo()).toBeTruthy();
  });

  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-logo></app-logo>");

    const element = await page.find("app-logo");
    expect(element).toHaveClass("hydrated");
  });
});
