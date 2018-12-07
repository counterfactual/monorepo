import { newE2EPage } from "@stencil/core/testing";

describe("form-container", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<form-container></form-container>");

    const element = await page.find("form-container");
    expect(element).toHaveClass("hydrated");
  });
});
