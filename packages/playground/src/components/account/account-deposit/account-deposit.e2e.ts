import { newE2EPage } from "@stencil/core/testing";

describe("account-deposit", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<account-deposit></account-deposit>");

    const element = await page.find("account-deposit");
    expect(element).toHaveClass("hydrated");
  });
});
