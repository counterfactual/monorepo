import { newE2EPage } from "@stencil/core/testing";

describe("app-game-die", () => {
  it("renders", async () => {
    const page = await newE2EPage();
    await page.setContent("<app-game></app-game>");

    const element = await page.find("app-game");
    expect(element).toHaveClass("hydrated");
  });
});
