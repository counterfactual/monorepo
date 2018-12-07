import { newE2EPage } from "@stencil/core/testing";

describe("form-container", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<form-container></form-container>");

    const element = await page.find("form-container");
    expect(element).toHaveClass("hydrated");
  });

  it("applies to .connected class to the dot when connected=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<form-container connected=true></form-container>");

    const element = await page.find("form-container >>> .dot");
    expect(element).toHaveClass("connected");
  });

  it("sets the status to 'Connected' when connected=true", async () => {
    const page = await newE2EPage();
    await page.setContent("<form-container connected=true></form-container>");

    const element = await page.find("form-container >>> .status");
    expect(element.innerText).toEqual("Connected");
  });

  it("does not apply the .connected class to the dot when connected=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<form-container></form-container>");

    const element = await page.find("form-container >>> .dot");
    expect(element).not.toHaveClass("connected");
  });

  it("sets the status to 'No Connection' when connected=false", async () => {
    const page = await newE2EPage();
    await page.setContent("<form-container></form-container>");

    const element = await page.find("form-container >>> .status");
    expect(element.innerText).toEqual("No Connection");
  });
});
