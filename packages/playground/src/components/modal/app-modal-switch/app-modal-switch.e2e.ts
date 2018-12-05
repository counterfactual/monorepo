import { newE2EPage } from "@stencil/core/testing";

describe("app-modal-switch", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-modal-switch></app-modal-switch>");

    const element = await page.find("app-modal-switch");
    expect(element).toHaveClass("hydrated");
  });

  it("renders an info container when authenticated=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-modal-switch authenticated=true></app-modal-switch>");

    const infoContainer = await page.find("app-modal-switch >>> .info-container");
    const btnContainer = await page.find("app-modal-switch >>> .btn-container");
    expect(infoContainer).not.toBeNull();
    expect(btnContainer).toBeNull();
  });

  it("renders an btn container when authenticated=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-modal-switch></app-modal-switch>");

    const infoContainer = await page.find("app-modal-switch >>> .info-container");
    const btnContainer = await page.find("app-modal-switch >>> .btn-container");
    expect(infoContainer).toBeNull();
    expect(btnContainer).not.toBeNull();
  });
});
