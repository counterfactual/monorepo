import { newE2EPage } from "@stencil/core/testing";

describe("AppAcceptInvite", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-accept-invite></app-accept-invite>");

    const element = await page.find("app-accept-invite");
    expect(element).toHaveClass("hydrated");
  });
});
