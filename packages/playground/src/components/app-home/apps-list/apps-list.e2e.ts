import { newE2EPage } from "@stencil/core/testing";

describe("apps-list", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<apps-list></apps-list>");

    const element = await page.find("apps-list");
    expect(element).toHaveClass("hydrated");
  });
});
