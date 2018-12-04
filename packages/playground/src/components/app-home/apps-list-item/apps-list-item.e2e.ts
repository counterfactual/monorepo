import { newE2EPage } from "@stencil/core/testing";

describe("apps-list-item", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<apps-list-item></apps-list-item>");

    const element = await page.find("apps-list-item");
    expect(element).toHaveClass("hydrated");
  });

  it("renders a notification bubble if notifications are present", async () => {
    const page = await newE2EPage();
    await page.setContent("<apps-list-item notifications=11></apps-list-item>");

    const element = await page.find("apps-list-item >>> .notification");
    expect(element.innerText).toEqual("11");
  });

  it("does not render a notification bubble if no notifications are present", async () => {
    const page = await newE2EPage();
    await page.setContent("<apps-list-item></apps-list-item>");

    const element = await page.find("apps-list-item >>> .notification");
    expect(element).toBeNull();
  });
});
