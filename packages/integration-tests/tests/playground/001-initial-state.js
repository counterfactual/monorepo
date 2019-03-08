module.exports = async (
  /** @type {import("selenium-webdriver").ThenableWebDriver} */ driver,
  /** @type {import("selenium-webdriver").Session} */ session,
  /** @type {string} */ url,
  /** @type {string[]} */ handles,
  /** @type {string} */ windowHandle
) => {
  await driver.get("http://localhost:3334");
  await driver.switchTo((await driver.getAllWindowHandles())[0]);

  driver;

  return true;
};
