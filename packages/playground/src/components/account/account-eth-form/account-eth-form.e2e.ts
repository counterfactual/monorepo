import { newE2EPage } from "@stencil/core/testing";

describe("account-eth-form", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<account-eth-form></account-eth-form>");

    const element = await page.find("account-eth-form");
    expect(element).toHaveClass("hydrated");
  });
});
