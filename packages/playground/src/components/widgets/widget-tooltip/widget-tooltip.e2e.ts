import { newE2EPage } from "@stencil/core/testing";

describe("widget-tooltip", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-tooltip></widget-tooltip>");

    const element = await page.find("widget-tooltip");
    expect(element).toHaveClass("hydrated");
  });
});
