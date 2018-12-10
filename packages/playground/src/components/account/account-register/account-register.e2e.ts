import { newE2EPage } from "@stencil/core/testing";

describe("account-register", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<account-register></account-register>");

    const element = await page.find("account-register");
    expect(element).toHaveClass("hydrated");
  });
});
