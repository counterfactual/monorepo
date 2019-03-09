const { By, until } = require("selenium-webdriver");
const fs = require("fs");

module.exports = async (
  /** @type {import("selenium-webdriver").ThenableWebDriver} */ driver,
  /** @type {import("selenium-webdriver").Session} */ session,
  /** @type {string} */ url,
  /** @type {string[]} */ handles,
  /** @type {string} */ windowHandle
) => {
  const { shouldContainElement, test } = require("../../utils/assertions")(
    driver
  );

  await test("should have Register button available", async () => {
    await shouldContainElement(By.id("register"));
  });

  await test("should go to /register after clicking Register button", async () => {
    const registerButton = await driver.findElement(By.css("#register"));
    await registerButton.takeScreenshot();
    fs.writeFileSync(
      "./register-button.png",
      Buffer.from(await registerButton.takeScreenshot(), "base64")
    );
    driver.sleep(1000);
    await registerButton.click();
    await driver.wait(until.urlContains("/register"));
  });

  return true;
};
