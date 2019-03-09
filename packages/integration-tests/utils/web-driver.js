const webdriver = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { By, until } = webdriver;
const path = require("path");

function encode(file) {
  var stream = require("fs").readFileSync(file);
  return Buffer.from(stream).toString("base64");
}

function decode(b64String) {
  return Buffer.from(b64String, "base64");
}

let chromeOptions = new chrome.Options();
chromeOptions.addExtensions(
  encode(path.resolve(__dirname, "../bin/metamask.crx"))
);

module.exports = async function runTests(setup, tests) {
  const driver = new webdriver.Builder()
    .forBrowser("chrome")
    .setChromeOptions(chromeOptions)
    .build();

  const session = await driver.getSession();
  const url = await driver.getCurrentUrl();
  const handles = await driver.getAllWindowHandles();
  const window = await driver.getWindowHandle(handles[0]);

  async function getExtShadowRoot(hostSelector) {
    let shadowHost;
    await (shadowHost = driver.findElement(By.css(hostSelector)));
    return driver.executeScript("return arguments[0].shadowRoot", shadowHost);
  }

  async function findShadowDomElement(hostSelector, shadowDomElement) {
    let shadowRoot;
    let element;
    await (shadowRoot = getExtShadowRoot(hostSelector));
    await shadowRoot.then(async result => {
      await (element = result.findElement(By.css(shadowDomElement)));
    });

    return element;
  }

  console.log("Setting up test environment...");
  try {
    if (!(await setup(driver, session, url, handles, window))) {
      console.error(
        "Setup failed. Make sure you're running a local instance of the Playground."
      );

      await driver.quit();
      process.exit(1);
    }
  } catch (e) {
    console.error("Setup failed", e);
    setTimeout(async () => {
      await driver.quit();
      process.exit(1);
    }, 100);
    return;
  }

  console.log("Running tests...");

  try {
    await Promise.all(
      tests.map(async test => test(driver, session, url, handles, window))
    );
  } catch (error) {
    console.log("Tests failed", error);
  } finally {
    setTimeout(async () => await driver.quit(), 100);
  }
};
