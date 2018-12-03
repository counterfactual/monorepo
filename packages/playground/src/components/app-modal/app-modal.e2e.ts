import { newE2EPage } from "@stencil/core/testing";

describe("app-modal", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-modal></app-modal>");

    const element = await page.find("app-modal");
    expect(element).toHaveClass("hydrated");
  });

  it("renders an info container when authenticated=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-modal authenticated=true></app-modal>");

    const infoContainer = await page.find("app-modal >>> .info-container");
    const btnContainer = await page.find("app-modal >>> .btn-container");
    expect(infoContainer).not.toBeNull();
    expect(btnContainer).toBeNull();
  });

  it("renders an btn container when authenticated=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-modal></app-modal>");

    const infoContainer = await page.find("app-modal >>> .info-container");
    const btnContainer = await page.find("app-modal >>> .btn-container");
    expect(infoContainer).toBeNull();
    expect(btnContainer).not.toBeNull();
  });
});
