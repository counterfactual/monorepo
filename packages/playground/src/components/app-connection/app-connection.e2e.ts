import { newE2EPage } from "@stencil/core/testing";

describe("app-connection", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-connection></app-connection>");

    const element = await page.find("app-connection");
    expect(element).toHaveClass("hydrated");
  });

  it("applies to .connected class to the dot when connected=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-connection connected=true></app-connection>");

    const element = await page.find("app-connection >>> .dot");
    expect(element).toHaveClass("connected");
  });

  it("sets the status to 'Connected' when connected=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-connection connected=true></app-connection>");

    const element = await page.find("app-connection >>> .status");
    expect(element.innerText).toEqual("Connected");
  });

  it("does not apply the .connected class to the dot when connected=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-connection></app-connection>");

    const element = await page.find("app-connection >>> .dot");
    expect(element).not.toHaveClass("connected");
  });

  it("sets the status to 'No Connection' when connected=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-connection></app-connection>");

    const element = await page.find("app-connection >>> .status");
    expect(element.innerText).toEqual("No Connection");
  });
});
