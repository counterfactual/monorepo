const { By, until } = require("selenium-webdriver");

module.exports = driver => ({
  async test(testTitle, testCallback) {
    try {
      await testCallback();
      console.log(`  ✔ ${testTitle}`);
    } catch (error) {
      console.log(`  ❌ ${testTitle}`);
      throw new Error(`Test failed: ${testTitle} - ${error.message}`);
    }
  },

  async shouldContainElement(locator) {
    try {
      await driver.findElement(By.tagName("widget-logo"));
      return true;
    } catch (e) {
      if (e.name === "NoSuchElementError") {
        return false;
      }
      throw e;
    }
  }
});
