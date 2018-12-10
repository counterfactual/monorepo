import { newE2EPage } from "@stencil/core/testing";

describe("header-drawer", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<header-drawer></header-drawer>");

    const element = await page.find("header-drawer");
    expect(element).toHaveClass("hydrated");
  });

  it("applies the .opened class when opened=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<header-drawer opened=true></header-drawer>");

    const element = await page.find("header-drawer >>> .drawer-container");
    expect(element).toHaveClass("opened");
  });

  it("does not apply the .opened class when opened=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<header-drawer></header-drawer>");

    const element = await page.find("header-drawer >>> .drawer-container");
    expect(element).not.toHaveClass("opened");
  });
});
