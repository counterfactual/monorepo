import { newE2EPage } from "@stencil/core/testing";

describe("account-exchange", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<account-exchange></account-exchange>");

    const element = await page.find("account-exchange");
    expect(element).toHaveClass("hydrated");
  });
});
