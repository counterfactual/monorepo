import { newE2EPage } from "@stencil/core/testing";

describe("app-game", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-game></app-game>");

    const element = await page.find("app-game");
    expect(element).toHaveClass("hydrated");
  });
  it("has dice", async () => {
    const page = await newE2EPage({ url: "/game" });

    const profileElement = await page.find("app-root >>> app-game");
    const element = profileElement.shadowRoot.querySelector(".player__dice");
    expect(element).toBeDefined();
  });
});
