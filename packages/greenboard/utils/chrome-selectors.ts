import { By, promise, WebDriver } from "selenium-webdriver";

export const EXTENSION_LIST_SELECTOR = By.id("extensions-list");

export const METAMASK_EXTENSION_URL_SELECTOR = async (driver: WebDriver) => {
  const names = await driver.findElements(By.className("name"));
  const urls = await driver.findElements(By.className("url"));

  return promise.filter(urls, async (element, index) => {
    return (
      (await names[index].getText()) === "MetaMask" &&
      (await element.getText()).startsWith("chrome-extension")
    );
  });
};
