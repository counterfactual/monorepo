describe("App", () => {
  beforeAll(async () => {
    await page.goto("http://localhost:8080/");
  });
  it("should instantiate", async () => {
    await expect(page).toMatchElement("playground-app");
  });
});
