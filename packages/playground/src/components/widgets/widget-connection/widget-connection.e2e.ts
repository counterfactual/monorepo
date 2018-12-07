import { newE2EPage } from "@stencil/core/testing";

describe("widget-connection", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-connection></widget-connection>");

    const element = await page.find("widget-connection");
    expect(element).toHaveClass("hydrated");
  });

  it("applies to .connected class to the dot when network is set", async () => {
    const page = await newE2EPage();
    await page.setContent(
      "<widget-connection network='Lorem'></widget-connection>"
    );

    const element = await page.find("widget-connection >>> .dot");
    expect(element).toHaveClass("connected");
  });

  it("sets the status to 'Connected' when network is set", async () => {
    const page = await newE2EPage();
    await page.setContent(
      "<widget-connection network='Lorem'></widget-connection>"
    );

    const element = await page.find("widget-connection >>> .status");
    expect(element.innerText).toEqual("Connected to Lorem");
  });

  it("does not apply the .connected class to the dot when network isn't set", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-connection></widget-connection>");

    const element = await page.find("widget-connection >>> .dot");
    expect(element).not.toHaveClass("connected");
  });

  it("sets the status to 'No Connection' when network isn't set", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-connection></widget-connection>");

    const element = await page.find("widget-connection >>> .status");
    expect(element.innerText).toEqual("No Connection");
  });
});