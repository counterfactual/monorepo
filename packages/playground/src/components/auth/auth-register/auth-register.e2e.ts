import { newE2EPage } from "@stencil/core/testing";

describe("auth-register", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<auth-register></auth-register>");

    const element = await page.find("auth-register");
    expect(element).toHaveClass("hydrated");
  });
});
