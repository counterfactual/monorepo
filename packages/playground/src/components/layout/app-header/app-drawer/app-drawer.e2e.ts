import { newE2EPage } from "@stencil/core/testing";

describe("app-drawer", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-drawer></app-drawer>");

    const element = await page.find("app-drawer");
    expect(element).toHaveClass("hydrated");
  });

  it("applies the .opened class when opened=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-drawer opened=true></app-drawer>");

    const element = await page.find("app-drawer >>> .drawer-container");
    expect(element).toHaveClass("opened");
  });

  it("does not apply the .opened class when opened=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-drawer></app-drawer>");

    const element = await page.find("app-drawer >>> .drawer-container");
    expect(element).not.toHaveClass("opened");
  });
});
