import { newE2EPage } from "@stencil/core/testing";

describe("widget-error-message", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-error-message></widget-error-message>");

    const element = await page.find("widget-error-message");
    expect(element).toHaveClass("hydrated");
  });
});
