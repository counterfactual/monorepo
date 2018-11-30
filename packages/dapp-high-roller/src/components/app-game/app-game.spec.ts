import { AppGame } from "./app-game";

describe("app-game", () => {
  it("should build", () => {
    expect(new AppGame()).toBeTruthy();
  });
});
