import { newE2EPage } from "@stencil/core/testing";

describe("form-input", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<form-input></form-input>");

    const element = await page.find("form-input");
    expect(element).toHaveClass("hydrated");
  });
});
