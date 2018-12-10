import { newE2EPage } from "@stencil/core/testing";

describe("widget-logo", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-logo></widget-logo>");

    const element = await page.find("widget-logo");
    expect(element).toHaveClass("hydrated");
  });
});
