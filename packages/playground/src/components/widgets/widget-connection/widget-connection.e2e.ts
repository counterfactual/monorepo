import { newE2EPage } from "@stencil/core/testing";

describe("widget-connection", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-connection></widget-connection>");

    const element = await page.find("widget-connection");
    expect(element).toHaveClass("hydrated");
  });

  it("applies to .connected class to the dot when connected=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-connection connected=true></widget-connection>");

    const element = await page.find("widget-connection >>> .dot");
    expect(element).toHaveClass("connected");
  });

  it("sets the status to 'Connected' when connected=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-connection connected=true></widget-connection>");

    const element = await page.find("widget-connection >>> .status");
    expect(element.innerText).toEqual("Connected");
  });

  it("does not apply the .connected class to the dot when connected=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-connection></widget-connection>");

    const element = await page.find("widget-connection >>> .dot");
    expect(element).not.toHaveClass("connected");
  });

  it("sets the status to 'No Connection' when connected=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-connection></widget-connection>");

    const element = await page.find("widget-connection >>> .status");
    expect(element.innerText).toEqual("No Connection");
  });
});
