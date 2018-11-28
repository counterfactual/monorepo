import { newE2EPage } from "@stencil/core/testing";

describe("apps-list-item", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<apps-list-item></apps-list-item>");

    const element = await page.find("apps-list-item");
    expect(element).toHaveClass("hydrated");
  });
});
