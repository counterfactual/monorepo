const { By, until } = require("selenium-webdriver");

module.exports = async (
  /** @type {import("selenium-webdriver").ThenableWebDriver} */ driver,
  /** @type {import("selenium-webdriver").Session} */ session,
  /** @type {string} */ url,
  /** @type {string[]} */ handles,
  /** @type {string} */ windowHandle
) => {
  // Configures the wallet.
  await driver.sleep(5000);
  await driver.switchTo().window((await driver.getAllWindowHandles())[1]);

  const seedPhrase =
    "uniform drip around nephew crunch position broken derive nothing wait infant friend";

  // Get started.
  await driver.findElement(By.tagName("button")).click();

  // Select "Import from seed phrase"
  await driver.findElement(By.className("first-time-flow__button")).click();

  // Skip data collection.
  await driver.findElement(By.className("btn-default")).click();

  // Add seedphrase and password.
  await driver.sleep(2000);

  await driver
    .findElement(By.className("first-time-flow__textarea"))
    .sendKeys(seedPhrase);
  await driver.findElement(By.id("password")).sendKeys("asdf1234");
  await driver.findElement(By.id("confirm-password")).sendKeys("asdf1234");

  // Accept terms & conditions.
  await driver.findElement(By.className("first-time-flow__checkbox")).click();
  await driver.findElement(By.className("btn-confirm")).click();

  // Wait until flow is complete and leave.
  await driver.wait(async () => {
    try {
      return (await driver.findElement(
        By.className("end-of-flow")
      )).isDisplayed();
    } catch {
      return false;
    }
  });
  await driver.findElement(By.className("btn-confirm")).click();

  // Select network.
  await driver.findElement(By.className("network-component")).click();
  const networks = await driver.findElements(
    By.className("dropdown-menu-item")
  );
  await networks[1].click(); // Ropsten

  // Checks the local Playground UI to be working.
  await driver.get("http://localhost:3334");
  await driver.sleep(3000);

  return true;
};
