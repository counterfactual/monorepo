import { newE2EPage } from "@stencil/core/testing";

<<<<<<< 9ead928bc7ced763726d4ad32adb1b63dc0a8b67
describe("app-header", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-header></app-header>");

    const element = await page.find("app-header");
=======
describe("apps-list", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<apps-list></apps-list>");

    const element = await page.find("apps-list");
>>>>>>> misc style fixes, as well as compentization of the header
    expect(element).toHaveClass("hydrated");
  });
});
