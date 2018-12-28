import { newE2EPage } from "@stencil/core/testing";

describe.skip("widget-dialog", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-dialog></widget-dialog>");

    const element = await page.find("widget-dialog");
    expect(element).toHaveClass("hydrated");
  });
});
