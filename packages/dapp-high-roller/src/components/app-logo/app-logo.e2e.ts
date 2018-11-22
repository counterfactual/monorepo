import { newE2EPage } from "@stencil/core/testing";

describe("app-logo", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-logo></app-logo>");

    const element = await page.find("app-logo");
    expect(element).toHaveClass("hydrated");
  });
  it("has logo", async () => {
    const page = await newE2EPage({ url: "/" });

    const profileElement = await page.find("app-root >>> app-logo");
    const element = profileElement.shadowRoot.querySelector("img");
    expect(element).toBeDefined();
  });
});
