import { newE2EPage } from "@stencil/core/testing";

describe("auth-login", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<auth-login></auth-login>");

    const element = await page.find("auth-login");
    expect(element).toHaveClass("hydrated");
  });

  it("renders an info container when authenticated=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<auth-login authenticated=true></auth-login>");

    const infoContainer = await page.find("auth-login >>> .info-container");
    const btnContainer = await page.find("auth-login >>> .btn-container");
    expect(infoContainer).not.toBeNull();
    expect(btnContainer).toBeNull();
  });

  it("renders an btn container when authenticated=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<auth-login></auth-login>");

    const infoContainer = await page.find("auth-login >>> .info-container");
    const btnContainer = await page.find("auth-login >>> .btn-container");
    expect(infoContainer).toBeNull();
    expect(btnContainer).not.toBeNull();
  });
});
