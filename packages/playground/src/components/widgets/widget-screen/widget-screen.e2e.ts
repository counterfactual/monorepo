import { newE2EPage } from "@stencil/core/testing";

describe("widget-screen", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-screen></widget-screen>");

    const element = await page.find("widget-screen");
    expect(element).toHaveClass("hydrated");
  });
});
