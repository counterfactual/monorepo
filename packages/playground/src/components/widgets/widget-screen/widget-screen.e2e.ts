import { newE2EPage } from "@stencil/core/testing";

describe("widget-screen", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-screen></widget-screen>");

    const element = await page.find("widget-screen");
    expect(element).toHaveClass("hydrated");
  });

  it("applies to .connected class to the dot when connected=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-screen connected=true></widget-screen>");

    const element = await page.find("widget-screen >>> .dot");
    expect(element).toHaveClass("connected");
  });

  it("sets the status to 'Connected' when connected=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-screen connected=true></widget-screen>");

    const element = await page.find("widget-screen >>> .status");
    expect(element.innerText).toEqual("Connected");
  });

  it("does not apply the .connected class to the dot when connected=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-screen></widget-screen>");

    const element = await page.find("widget-screen >>> .dot");
    expect(element).not.toHaveClass("connected");
  });

  it("sets the status to 'No Connection' when connected=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<widget-screen></widget-screen>");

    const element = await page.find("widget-screen >>> .status");
    expect(element.innerText).toEqual("No Connection");
  });
});
