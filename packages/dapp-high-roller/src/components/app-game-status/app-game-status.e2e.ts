import { newE2EPage } from "@stencil/core/testing";

describe("app-game-status", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-game-status></app-game-status>");

    const element = await page.find("app-game-status");
    expect(element).toHaveClass("hydrated");
  });
  it("has divider", async () => {
    const page = await newE2EPage({ url: "/game" });

    const profileElement = await page.find("app-root >>> app-game-status");
    const element = profileElement.shadowRoot.querySelector(".divider__status");
    expect(element).toBeDefined();
  });
});
