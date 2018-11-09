import { newE2EPage } from "@stencil/core/testing";

describe("navigation", () => {
  it("goes to the home page", async () => {
    const page = await newE2EPage({ url: "/" });

    const home = await page.find("app-root");
    expect(home).toBeTruthy();
  });
});
