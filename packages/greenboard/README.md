# 💚 Greenboard

An automated end-to-end test suite for Counterfactual, built with Selenium.

## Quick start

### How does this work?

This package is executed from the monorepo's root, via `yarn test:e2e`.

### How do I write a new scenario?

- Add a `.spec.ts` file into the `tests/` folder.
- Instantiate the `TestBrowser` class and start an instance.
- Add the following preconfiguration step:

```ts
await browser.prepare();
```

This will preconfigure Metamask and connect the Wallet UI with the Ethereum provider.

Then, use the [TestBrowser's API](./utils/test-browser.ts) to implement your scenario.

## Deep-diving into the Greenboard

### Setting up a scenario

In order to test a new flow with Greenboard, you'll need to consider the following:

- Every time a test is executed, the test runner will create a new browser instance.
- Every time a new browser instance is created, Metamask must be configured from scratch.

This is the base template for any new scenario:

```ts
// tests/new-test.spec.ts

import { TestBrowser } from "../utils/test-browser";

// Add a long timeout for the test.
jest.setTimeout(100000);

// Instantiate the TestBrowser class and preconfigure Metamask.
beforeAll(async () => {
  browser = new TestBrowser();
  await browser.start();
  await browser.prepare();
});

// Describe the scenario.
it("registers a new account and goes to /channels", async () => {
  // Write your test here!
});

// Destroy the TestBrowser after running the tests.
afterAll(async () => {
  await browser.closeBrowser();
});
```

### The TestBrowser class

This class creates a Chrome/Chromium browser, with a build of the Metamask + CF extension. The browser, controlled by Selenium, uses a temporary user profile, stored in `/tmp/greenboard`, which is cleaned up before running any tests.

Before running a test, there are several steps involved in configuring the Metamask extension and opening the Wallet UI, conveniently wrapped under the `browser.prepare()` method:

1. Open the Metamask homepage.

2. Automate Metamask's onboarding flow by configuring a wallet with a given seed phrase and password.

3. Wait for Metamask to show the main UI.

4. Change the extension's network according to networkName. For all purposes, testing with Counterfactual is done through the "kovan" network.

5. Open the Wallet UI in the IFRAME.

6. Wait for Metamask to request permission to connect the Wallet UI with the Ethereum Provider and grant permission by clicking the "Connect" button.

Once these steps are completed, we're ready to work on our scenario.

#### Switching contexts

The TestBrowser class is a wrapper of a Web Driver. As such, the Web Driver needs to know in which scope the commands are being executed. Possible scopes are:

- The Metamask window itself
- The Metamask popup window
- The Wallet UI IFRAME

For each context, there is a utility method available: `switchToMetamask()`, `switchToMetamaskPopup()` and `switchToWallet()`.

Particularly for the popup window, `switchToMetamaskPopup` takes a parameter `transactionType` that specifies what popup is the Web Driver expecting to find (i.e. `signatureRequest` or `deposit`).

#### Selecting elements

Once the context is set, we can start operating with the elements on the screen. The following utility methods mostly use a `locator` parameter of type `Locator`, as seen in [Selenium](https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_By.html).

- `getElements(locator)`: Returns an array of elements that match a given locator.
- `getElement(locator)`: Returns a single element found by the given selector. It'll retry up to 5 times to get the element immediately. This retry strategy is added to prevent stale references failures due to DOM locks.
- `findElementByPartialTextMatch(locator, text)`: Returns the first element that matches with the locator and includes a given text.
- `findElementByExactTextMatch(locator, text)`: Returns the first element that matches with the locator and contains exactly a given text.

#### Waiting for elements

Sometimes is necessary to wait for an element to show up on the screen on to meet a certain condition. These methods can help you with that:

- `waitForElementToHaveText(locator, text)`: Waits for an element to contain a given text. Useful for checking, for example, if a button is showing a certain label to reflect state. It'll retry up to 5 times to get the element, with delays of 50ms. This retry strategy is added to prevent stale reference failures due to DOM locks.
- `waitForElement(locator[, timeout])`: Waits for an element to be located in the DOM tree. If a timeout is specified and the element isn't found by that time, the method throws an error.

#### Interacting with elements

Need to click a button or type some text? We've got you covered:

- `clickOnElement(locator)`: Clicks an element found by the locator.
- `typeOnInput(locator, value):` Types a given text in an input field found by the locator.
- `getTextFromElement(locator)`: Returns the text contained in an element.

#### Automating Counterfactual Wallet flows

To speed up the process of getting an user with a valid account, there are two automation methods for the onboarding flow:

- `fillAccountRegistrationFormAndSubmit()`: After clicking the "Setup Counterfactual" button, call this method to autocomplete the "Create an account form", submit it, sign the transaction and advance to the "Deposit screen".
- `fillAccountDepositFormAndSubmit()`: After creating an account, use this method to make a deposit, sign it and advance to the "Channels" screen.

### Selectors

There are two important selector lists on this package:

- `metamask-selectors.ts`: Contains references to elements of the Metamask UI.
- `counterfactual-wallet-selectors.ts`: Contains references to elements of the Counterfactual Wallet UI.

Use these files to define any locators you want to use in your tests, so they can be shared and reused across multiple scenarios.
