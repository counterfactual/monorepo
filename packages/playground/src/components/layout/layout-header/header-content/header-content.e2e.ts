import { newE2EPage } from "@stencil/core/testing";

describe("header-content", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<header-content></header-content>");

    const element = await page.find("header-content");
    expect(element).toHaveClass("hydrated");
  });
});
