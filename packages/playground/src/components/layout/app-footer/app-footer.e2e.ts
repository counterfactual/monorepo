import { newE2EPage } from "@stencil/core/testing";

describe("app-footer", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-footer></app-footer>");

    const element = await page.find("app-footer");
    expect(element).toHaveClass("hydrated");
  });
});
