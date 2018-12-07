import { newE2EPage } from "@stencil/core/testing";

describe("form-button", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<form-button></form-button>");

    const element = await page.find("form-button");
    expect(element).toHaveClass("hydrated");
  });
});
