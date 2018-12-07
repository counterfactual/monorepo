import { newE2EPage } from "@stencil/core/testing";

describe("account-edit", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<account-edit></account-edit>");

    const element = await page.find("account-edit");
    expect(element).toHaveClass("hydrated");
  });
});
