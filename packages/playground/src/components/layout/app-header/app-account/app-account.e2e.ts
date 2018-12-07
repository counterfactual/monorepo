import { newE2EPage } from "@stencil/core/testing";

describe("app-account", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-account></app-account>");

    const element = await page.find("app-account");
    expect(element).toHaveClass("hydrated");
  });

  it("renders an info container when authenticated=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-account authenticated=true></app-account>");

    const infoContainer = await page.find("app-account >>> .info-container");
    const btnContainer = await page.find("app-account >>> .btn-container");
    expect(infoContainer).not.toBeNull();
    expect(btnContainer).toBeNull();
  });

  it("renders an btn container when authenticated=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-account></app-account>");

    const infoContainer = await page.find("app-account >>> .info-container");
    const btnContainer = await page.find("app-account >>> .btn-container");
    expect(infoContainer).toBeNull();
    expect(btnContainer).not.toBeNull();
  });
});
