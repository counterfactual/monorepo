import { newE2EPage } from "@stencil/core/testing";

describe("app-game", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-game></app-game>");

    const element = await page.find("app-game");
    expect(element).toHaveClass("hydrated");
  });
  it("can start and play game", async () => {
    const page = await newE2EPage({ url: "/game" });

    const profileElement = await page.find("app-root >>> app-game");
    const playBtn = profileElement.shadowRoot.querySelector(".btn.btn--center");
    expect(playBtn.textContent).toContain("Roll your dice!");

    /*     await playBtn.click();
    await page.waitForChanges();

    const exitBtn = profileElement.shadowRoot.querySelector(".btn.btn--exit");
    const rematchBtn = profileElement.shadowRoot.querySelector(
      ".btn.btn--rematch"
    );
    expect(exitBtn.textContent).toContain("Roll your dice!");
 */
  });
});
