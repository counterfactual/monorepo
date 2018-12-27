import { newE2EPage } from "@stencil/core/testing";

describe.skip("layout-footer", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<layout-footer></layout-footer>");

    const element = await page.find("layout-footer");
    expect(element).toHaveClass("hydrated");
  });
});
