import { newE2EPage } from "@stencil/core/testing";

describe("header-account", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<header-account></header-account>");

    const element = await page.find("header-account");
    expect(element).toHaveClass("hydrated");
  });

  it("renders an info container when authenticated=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<header-account authenticated=true></header-account>");

    const infoContainer = await page.find("header-account >>> .info-container");
    const btnContainer = await page.find("header-account >>> .btn-container");
    expect(infoContainer).not.toBeNull();
    expect(btnContainer).toBeNull();
  });

  it("renders an btn container when authenticated=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<header-account></header-account>");

    const infoContainer = await page.find("header-account >>> .info-container");
    const btnContainer = await page.find("header-account >>> .btn-container");
    expect(infoContainer).toBeNull();
    expect(btnContainer).not.toBeNull();
  });
});
