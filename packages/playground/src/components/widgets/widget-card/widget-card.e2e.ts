import { newE2EPage } from "@stencil/core/testing";

describe("widget-card", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-card></widget-card>");

    const element = await page.find("widget-card");
    expect(element).toHaveClass("hydrated");
  });
});
