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

  await test("widget-connection should say 'Connected to Ropsten' in green", async () => {
    await shouldContainElement(By.css("widget-connetion .dot.connected"));

    const status = await driver.findElement(
      By.css("widget-connection .status")
    );
    if (status.getText() !== "Connected to Ropsten") {
      return false;
    }
  });

  await test("should show app-home explaining what is the Playground", async () => {
    await shouldContainElement(By.tagName("app-home"));
    await shouldContainElement(By.css("app-home .welcome-message"));
  });

  return true;
};
