import { newE2EPage } from "@stencil/core/testing";

describe("app-game-player", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-game></app-game>");

    const element = await page.find("app-game");
    expect(element).toHaveClass("hydrated");
  });
  it("has dice", async () => {
    const page = await newE2EPage({ url: "/game" });

    const profileElement = await page.find("app-root >>> app-game-player");
    const element = profileElement.shadowRoot.querySelector(".player__dice");
    expect(element).toBeDefined();
  });
  describe("can receive props", () => {
    it("can receive props", async () => {
      const page = await newE2EPage({ url: "/game" });

      const profileElement = await page.find("app-root >>> app-game-player");
      profileElement.setProperty("myName", "Alon");

      await page.waitForChanges();

      const element = profileElement.shadowRoot.querySelector(".player__dice");
      expect(element).toBeDefined();
    });
  });
});
