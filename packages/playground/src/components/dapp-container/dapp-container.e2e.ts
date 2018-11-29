import { newE2EPage } from "@stencil/core/testing";

describe("dapp-container", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent('<dapp-container url="foo.html"></dapp-container>');

    const element = await page.find("dapp-container");
    expect(element).toHaveClass("hydrated");

    const iframe = await page.find("dapp-container >>> iframe");
    expect(iframe).toEqualAttribute("url", "foo.html");
  });
});
