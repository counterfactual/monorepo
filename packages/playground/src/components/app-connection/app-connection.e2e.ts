import { newE2EPage } from "@stencil/core/testing";

describe("app-connection", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-connection></app-connection>");

    const element = await page.find("app-connection");
    expect(element).toHaveClass("hydrated");
  });
});
