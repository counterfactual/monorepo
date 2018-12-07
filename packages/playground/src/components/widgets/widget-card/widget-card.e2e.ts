import { newE2EPage } from "@stencil/core/testing";

describe("widget-card", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-card></widget-card>");

    const element = await page.find("widget-card");
    expect(element).toHaveClass("hydrated");
  });

  it("applies to .connected class to the dot when connected=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-card connected=true></widget-card>");

    const element = await page.find("widget-card >>> .dot");
    expect(element).toHaveClass("connected");
  });

  it("sets the status to 'Connected' when connected=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-card connected=true></widget-card>");

    const element = await page.find("widget-card >>> .status");
    expect(element.innerText).toEqual("Connected");
  });

  it("does not apply the .connected class to the dot when connected=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-card></widget-card>");

    const element = await page.find("widget-card >>> .dot");
    expect(element).not.toHaveClass("connected");
  });

  it("sets the status to 'No Connection' when connected=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-card></widget-card>");

    const element = await page.find("widget-card >>> .status");
    expect(element.innerText).toEqual("No Connection");
  });
});
