import { newE2EPage } from "@stencil/core/testing";

describe("app-nav", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-nav></app-nav>");

    const element = await page.find("app-nav");
    expect(element).toHaveClass("hydrated");
  });
});
