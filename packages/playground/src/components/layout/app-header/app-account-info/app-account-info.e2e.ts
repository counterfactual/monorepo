import { newE2EPage } from "@stencil/core/testing";

describe("app-account-info", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-account-info></app-account-info>");

    const element = await page.find("app-account-info");
    expect(element).toHaveClass("hydrated");
  });

  it("renders the provided img src, header, and content", async () => {
    const src = "foo.png";
    const header = "header";
    const content = "content";
    const page = await newE2EPage();
    await page.setContent(
      `<app-account-info src="${src}" header="${header}" content="${content}"></app-account-info>`
    );

    const imgElem = await page.find("app-account-info >>> .info-img");
    const headerElem = await page.find("app-account-info >>> .header");
    const contentElem = await page.find("app-account-info >>> .content");
    expect(imgElem.getAttribute("src")).toEqual(src);
    expect(headerElem.innerText).toEqual(header);
    expect(contentElem.innerText).toEqual(content);
  });
});
