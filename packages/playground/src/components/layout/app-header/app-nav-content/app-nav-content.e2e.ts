import { newE2EPage } from "@stencil/core/testing";

describe("app-nav-content", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-nav-content></app-nav-content>");

    const element = await page.find("app-nav-content");
    expect(element).toHaveClass("hydrated");
  });
});
