const { By } = require("selenium-webdriver");

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

  await test("should contain widget-logo", async () => {
    await shouldContainElement(By.tagName("widget-logo"));
  });

  await test("should contain widget-connection", async () => {
    await shouldContainElement(By.tagName("widget-logo"));
  });

  await test("should contain header-account", async () => {
    await shouldContainElement(By.tagName("header-account"));
  });

  return true;
};
