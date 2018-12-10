import { newE2EPage } from "@stencil/core/testing";

describe("widget-header", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-header></widget-header>");

    const element = await page.find("widget-header");
    expect(element).toHaveClass("hydrated");
  });
});
