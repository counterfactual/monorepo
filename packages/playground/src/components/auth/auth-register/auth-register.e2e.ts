import { newE2EPage } from "@stencil/core/testing";

describe("auth-register", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<auth-register></auth-register>");

    const element = await page.find("auth-register");
    expect(element).toHaveClass("hydrated");
  });

  it("renders an info container when authenticated=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<auth-register authenticated=true></auth-register>");

    const infoContainer = await page.find("auth-register >>> .info-container");
    const btnContainer = await page.find("auth-register >>> .btn-container");
    expect(infoContainer).not.toBeNull();
    expect(btnContainer).toBeNull();
  });

  it("renders an btn container when authenticated=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<auth-register></auth-register>");

    const infoContainer = await page.find("auth-register >>> .info-container");
    const btnContainer = await page.find("auth-register >>> .btn-container");
    expect(infoContainer).toBeNull();
    expect(btnContainer).not.toBeNull();
  });
});
