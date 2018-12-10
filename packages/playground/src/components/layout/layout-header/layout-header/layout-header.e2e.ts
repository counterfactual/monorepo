import { newE2EPage } from "@stencil/core/testing";

describe("layout-header", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<layout-header></layout-header>");

    const element = await page.find("layout-header");
    expect(element).toHaveClass("hydrated");
  });
});
