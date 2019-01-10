import { newE2EPage } from "@stencil/core/testing";

describe("AppWaiting", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-waiting></app-waiting>");

    const element = await page.find("app-waiting");
    expect(element).toHaveClass("hydrated");
  });
});
