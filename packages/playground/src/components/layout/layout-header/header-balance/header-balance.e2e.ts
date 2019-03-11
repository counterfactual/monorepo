import { newE2EPage } from "@stencil/core/testing";

describe("header-balance", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<header-balance></header-balance>");

    const element = await page.find("header-balance");
    expect(element).toHaveClass("hydrated");
  });
});
