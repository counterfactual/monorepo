import { newE2EPage } from "@stencil/core/testing";

describe("auth-login", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<auth-login></auth-login>");

    const element = await page.find("auth-login");
    expect(element).toHaveClass("hydrated");
  });
});
