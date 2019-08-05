require("chromedriver");

import { resolve } from "path";
import {
  Builder,
  Locator,
  until,
  WebDriver,
  WebElement,
  WebElementPromise
} from "selenium-webdriver";
import Chrome, { Options, ServiceBuilder } from "selenium-webdriver/chrome";
import {
  EXTENSION_LIST_SELECTOR,
  METAMASK_EXTENSION_URL_SELECTOR
} from "./chrome-selectors";
import {
  ACCOUNT_DEPOSIT_SELECTORS,
  ACCOUNT_REGISTRATION_SELECTORS,
  LAYOUT_HEADER_SELECTORS
} from "./counterfactual-wallet-selectors";
import {
  DEPOSIT_SELECTORS,
  findItemByExactTextMatch,
  findItemByPartialTextMatch,
  FIRST_TIME_FLOW_SELECTORS,
  MAIN_SCREEN_SELECTORS,
  NETWORK_SELECTORS,
  NOTIFICATION_SELECTORS,
  REQUEST_SIGNATURE_SELECTORS,
  WALLET_AUTHORIZATION_MODAL_SELECTORS
} from "./metamask-selectors";
import {
  CounterfactualScreenName,
  MetamaskNetwork,
  MetamaskOptions,
  MetamaskTransaction,
  TestBrowserContext
} from "./types";

export const EXTENSION_INSPECTOR = "chrome://inspect/#extensions";
export const LOCATOR_TIMEOUT = 10000;

/**
 * Creates a Chrome browser, with a build of the Metamask + CF extension.
 */
export class TestBrowser {
  constructor(
    private browser: WebDriver = {} as WebDriver,
    private homeUrl: string = "",
    private popupUrl: string = "",
    private readonly handlesByContext: {
      [key in Exclude<TestBrowserContext, "counterfactual:wallet">]: string;
    } = {
      [TestBrowserContext.MetamaskMain]: "",
      [TestBrowserContext.MetamaskPopup]: ""
    },
    private currentContext?: TestBrowserContext,
    private readonly locatorTimeout: number = LOCATOR_TIMEOUT
  ) {}

  async start() {
    const extension = resolve(__dirname, "../extension");

    const chromeDriver = new ServiceBuilder(
      process.env.CHROME_DRIVER_PATH || require("chromedriver").path
    ).build();

    Chrome.setDefaultService(chromeDriver);

    await chromeDriver.start();

    const browserFactory = new Builder().forBrowser("chrome");

    const options = new Options();
    options.addArguments(
      `--load-extension=${extension}`,
      `--disable-web-security`,
      `--user-data-dir=/tmp/greenboard`
    );

    if (process.env.CI) {
      options.setChromeBinaryPath(process.env.CHROME_BINARY_PATH as string);
    }

    this.browser = browserFactory
      .setChromeOptions(options)
      .setAlertBehavior("accept")
      .build();

    if (!process.argv.includes("--discover-metamask")) {
      await this.browser.sleep(5000);

      const handles = await this.browser.getAllWindowHandles();

      this.handlesByContext[
        TestBrowserContext.MetamaskMain
      ] = handles.pop() as string;

      await this.switchToMetamask();

      this.homeUrl = await this.browser.getCurrentUrl();
      this.popupUrl = this.homeUrl.replace(/home/gi, "popup");
    }
  }

  /****************************************************************
   * Metamask Automations API
   ****************************************************************/

  /**
   * This function will prepare the browser for using the Counterfactual
   * Wallet UI by doing the following:
   *
   * 1) Open the Metamask homepage.
   *
   * 2) Automate Metamask's onboarding flow by configuring a wallet
   *    with a given seed phrase and password.
   *
   * 3) Wait for Metamask to show the main UI.
   *
   * 4) Change the extension's network according to `networkName`. For all purposes,
   *    testing with Counterfactual is done through the "kovan" network.
   *
   * 5) Open the Wallet UI in the IFRAME.
   *
   * 6) Wait for Metamask to request permission to connect the Wallet UI
   *    with the Ethereum Provider and grant permission by clicking
   *    the "Connect" button.
   *
   * This function is a convenient wrapper for openMetamask(),
   * setupMetamask(), waitForMetamaskMainScreen, setMetamaskNetwork(),
   * openCounterfactualWallet() and authorizeWallet().
   *
   * @param networkName {MetamaskNetwork}
   */
  async prepare(networkName: MetamaskNetwork = "kovan") {
    await this.openMetamask();
    await this.setupMetamask();
    await this.waitForMetamaskMainScreen();
    await this.setMetamaskNetwork(networkName);
    await this.openCounterfactualWallet();
    await this.authorizeWallet();
  }

  /**
   * Only used if the `--discover-metamask` flag is passed to the test runner.
   *
   * Opens the Metamask extension page in the current window. It'll automatically
   * lookup the extension ID from the Extensions Inspector and save the `home`
   * and `popup` URLs for later usage. If such URLs are already defined,
   * it'll skip the lookup and navigate to `homeUrl`.
   */
  async openMetamask() {
    if (!process.argv.includes("--discover-metamask")) {
      await this.switchToMetamask();
      return;
    }

    if (this.homeUrl && this.popupUrl) {
      await this.navigateTo(this.homeUrl);
      return;
    }

    await this.waitForExtensionsList();

    const backgroundPageUrl = await this.getTextFromElement(
      METAMASK_EXTENSION_URL_SELECTOR
    );

    this.homeUrl = backgroundPageUrl.replace(
      "_generated_background_page",
      "home"
    );
    this.popupUrl = backgroundPageUrl.replace(
      "_generated_background_page",
      "popup"
    );

    await this.navigateTo(this.homeUrl);
    await this.switchToMetamask();
  }

  /**
   * Automates Metamask's onboarding flow by configuring a wallet
   * with a given seed phrase and password.
   *
   * @param settings
   */
  async setupMetamask(
    settings: MetamaskOptions = {
      seedPhraseValue:
        "mistake cash photo pond little nerve neutral adapt item kite radar tray",
      passwordValue: "The Cake Is A Lie"
    }
  ) {
    const { seedPhraseValue, passwordValue } = settings;
    const {
      getStartedButton,
      importFromSeedPhraseButton,
      iAgreeButton,
      seedPhraseInput,
      passwordInput,
      confirmPasswordInput,
      acceptTermsAndConditionsCheckbox,
      importSubmitButton,
      endOfFlowScreen,
      allDoneButton
    } = FIRST_TIME_FLOW_SELECTORS;

    // Welcome screen
    await this.clickOnElement(getStartedButton);

    // Import from seed phrase or create a new wallet?
    await this.clickOnElement(importFromSeedPhraseButton);

    // Accept privacy policy
    await this.clickOnElement(iAgreeButton);

    // Set seed phrase, password, accept terms and conditions and submit.
    await this.typeOnInput(seedPhraseInput, seedPhraseValue);
    await this.typeOnInput(passwordInput, passwordValue);
    await this.typeOnInput(confirmPasswordInput, passwordValue);
    await this.clickOnElement(acceptTermsAndConditionsCheckbox);
    await this.clickOnElement(importSubmitButton);

    // Wait for process to finish and leave onboarding.
    await this.waitForElement(endOfFlowScreen);
    await this.clickOnElement(allDoneButton);
  }

  /**
   * Waits for Metamask to show the main UI.
   */
  async waitForMetamaskMainScreen() {
    const { mainScreenContainer } = MAIN_SCREEN_SELECTORS;

    await this.waitForElement(mainScreenContainer);
  }

  /**
   * Changes the extension's network according to `networkName`. For all purposes,
   * testing with Counterfactual is done through the "kovan" network.
   *
   * @param networkName {MetamaskNetwork}
   */
  async setMetamaskNetwork(networkName: MetamaskNetwork = "kovan") {
    const {
      networkMenuButton,
      networkMenuList,
      networkMenuItem
    } = MAIN_SCREEN_SELECTORS;

    await this.clickOnElement(networkMenuButton);
    await this.waitForElement(networkMenuList);

    await this.clickOnElement(networkMenuItem(networkName));
    await this.waitForElement(NETWORK_SELECTORS[networkName]);
  }

  /**
   * Clicks on the "Counterfactual" button on Metamask's sidebar and waits
   * until the Wallet UI's IFRAME is rendered.
   */
  async openCounterfactualWallet() {
    const { counterfactualToken, pluginIframe } = MAIN_SCREEN_SELECTORS;

    await this.clickOnElement(counterfactualToken);
    await this.waitForElement(pluginIframe);
  }

  /**
   * Waits for Metamask to request permission to connect the Wallet UI
   * with the Ethereum Provider and grants permission by clicking
   * the "Connect" button.
   */
  async authorizeWallet() {
    const {
      modalContainer,
      modalPrimaryButton
    } = WALLET_AUTHORIZATION_MODAL_SELECTORS;

    // Wait for authorization modal.
    await this.waitForElement(modalContainer);

    // Click "Connect".
    await this.clickOnElement(modalPrimaryButton);
  }

  /**
   * Changes the WebDriver's context to operate on the Metamask window.
   * Use this before further actions if you've been interacting with
   * other contexts before (Wallet UI, Metamask Popups).
   */
  async switchToMetamask() {
    await this.updateContext(TestBrowserContext.MetamaskMain);
  }

  /**
   * Simulates a click in the Metamask extension button by opening
   * a new tab pointing to the `popup.html` file, which handles
   * Metamask notifications. It'll wait for the expected popup
   * to be opened by checking if a selector related to that transaction
   * is rendered.
   *
   * @param transactionType
   */
  async switchToMetamaskPopup(transactionType: MetamaskTransaction) {
    // Timeouts are needed so Metamask has enough time to generate
    // the transaction and render the proper screen when forcing the
    // popup on a tab.
    const popupHandle = await this.openNewTab();
    this.handlesByContext[TestBrowserContext.MetamaskPopup] = popupHandle;

    await this.updateContext(TestBrowserContext.MetamaskPopup);

    await this.navigateTo(this.popupUrl);

    // Wait for popup to be ready.
    await this.waitForElement(NOTIFICATION_SELECTORS[transactionType]);
  }

  /**
   * Waits for the Signature Request popup to be opened,
   * clicks the "Sign" button and closes the popup.
   */
  async signTransaction() {
    const { signButton } = REQUEST_SIGNATURE_SELECTORS;

    await this.switchToMetamaskPopup("signatureRequest");
    await this.clickOnElement(signButton);

    await this.closeTab();

    await this.switchToWallet();
  }

  /**
   * Waits for the Deposit Confirmation popup to be opened,
   * clicks the "Confirm" button and closes the popup.
   */
  async confirmDeposit() {
    const { confirmButton } = DEPOSIT_SELECTORS;

    await this.switchToMetamaskPopup("deposit");
    await this.clickOnElement(confirmButton);

    await this.closeTab();

    await this.switchToWallet();
  }

  /****************************************************************
   * Counterfactual Wallet UI Automations API
   ****************************************************************/

  /**
   * Changes the WebDriver's context to operate on the Wallet UI's IFRAME.
   * Use this before trying to interact with any elements belonging to the
   * Wallet UI.
   */
  async switchToWallet() {
    await this.switchToMetamask();
    await this.updateContext(TestBrowserContext.CounterfactualWallet);
  }

  /**
   * Types in a username and an e-mail address for the "Create an account"
   * step of the onboarding flow, then clicks the "Create an account"
   * submit button. Then it'll wait for the button to show the "Check wallet"
   * label.
   *
   * @param username
   * @param email
   */
  async fillAccountRegistrationFormAndSubmit(
    username: string,
    email: string = ""
  ) {
    const {
      usernameInput,
      emailInput,
      createAccountButton
    } = ACCOUNT_REGISTRATION_SELECTORS;

    await this.typeOnInput(usernameInput, username);
    await this.typeOnInput(emailInput, email);
    await this.clickOnElement(createAccountButton);
    await this.waitForElementToHaveText(
      createAccountButton,
      "Check your wallet"
    );
    await this.signTransaction();
    await this.waitForElementToHaveText(
      createAccountButton,
      "Creating your account"
    );
  }

  /**
   * Waits for the Deposit screen to show, then clicks the Proceed button.
   * Confirms the deposit and waits for its completion. It'll timeout after
   * 90 seconds without any response.
   *
   * @todo Add check for texts "Transferring funds", "Collateralizing deposit".
   */
  async fillAccountDepositFormAndSubmit() {
    const { formTitle, proceedButton } = ACCOUNT_DEPOSIT_SELECTORS;
    const { logoContainer } = LAYOUT_HEADER_SELECTORS;

    await this.waitForElementToHaveText(formTitle, "Fund your account");
    await this.clickOnElement(proceedButton);
    await this.waitForElementToHaveText(proceedButton, "Check your wallet");
    await this.confirmDeposit();
    await this.waitForElement(logoContainer, 90000);
  }

  async getCurrentScreenName(): Promise<CounterfactualScreenName | void> {
    if (this.currentContext !== TestBrowserContext.CounterfactualWallet) {
      return;
    }

    const url = await this.browser.executeScript<string>(
      "return document.location.href"
    );

    if (url.includes("setup/register")) {
      return CounterfactualScreenName.OnboardingRegistration;
    }

    if (url.includes("setup/deposit")) {
      return CounterfactualScreenName.OnboardingDeposit;
    }

    if (url.includes("channels")) {
      return CounterfactualScreenName.Channels;
    }

    return CounterfactualScreenName.Welcome;
  }

  /****************************************************************
   * Browser Generic API
   ****************************************************************/

  /**
   * Closes the current window.
   */
  async closeTab() {
    await this.browser.close();
  }

  /**
   * Closes the entire browser.
   */
  async closeBrowser() {
    await this.browser.quit();
  }

  /**
   * Returns a list of elements found by the given selector.
   *
   * @param selector
   */
  getElements(selector: Locator): Promise<WebElement[]> {
    return new Promise(async (resolve, reject) => {
      setTimeout(() => reject("Timeout"), this.locatorTimeout);
      const result = await this.browser.findElements(selector);
      resolve(result);
    });
  }

  /**
   * Returns a single element found by the given selector. It'll retry up to
   * 5 times to get the element immediately. This retry strategy is added
   * to prevent stale references failures due to DOM locks.
   *
   * @param selector
   */
  getElement(selector: Locator): WebElementPromise {
    let result: WebElementPromise = {} as WebElementPromise;
    const attempts = 0;

    while (attempts < 5) {
      try {
        result = this.browser.wait(
          until.elementLocated(selector),
          this.locatorTimeout,
          selector.toString()
        );
        break;
      } catch (e) {
        const error = e as Error;
        if (!error.message.startsWith("StaleElementReferenceError")) {
          throw e;
        }
      }
    }

    return result;
  }

  /**
   * Waits for an element to be located in the DOM tree.
   *
   * @param selector
   */
  async waitForElement(selector: Locator, timeout = this.locatorTimeout) {
    await this.browser.wait(
      until.elementLocated(selector),
      timeout,
      selector.toString()
    );
  }

  /**
   * Clicks an element found by the selector.
   *
   * @param selector
   */

  async clickOnElement(selector: Locator) {
    await this.getElement(selector).click();
  }

  /**
   * Types a given text into the element found by the selector.
   *
   * @param selector
   */
  async typeOnInput(selector: Locator, value: string) {
    await this.getElement(selector).sendKeys(value);
  }

  /**
   * Returns the text contained in an element found by the selector.
   *
   * @param selector
   */
  async getTextFromElement(selector: Locator) {
    return this.getElement(selector).getText();
  }

  /**
   * Waits for an element to contain a given text. Useful for checking, for example,
   * if a button is showing a certain label to reflect state. It'll retry up to
   * 5 times to get the element, with delays of 50ms. This retry strategy is added
   * to prevent stale references failures due to DOM locks.
   *
   * @param selector
   * @param text
   */
  async waitForElementToHaveText(selector: Locator, expectedText: string) {
    let attempts = 0;

    while (attempts < 5) {
      try {
        const element = await this.getElement(selector);
        const currentText = await element.getText();

        return currentText.includes(expectedText);
      } catch (e) {
        const { message } = e as Error;
        if (message.startsWith("StaleElementReferenceError")) {
          await this.browser.sleep(50);
          attempts += 1;
        }
      }
    }

    return false;
  }

  /**
   * Finds an element in a list of nodes by a partial text match.
   * For example, you have a list of networks "Main Network", "Kovan Test Network",
   * "Rinkeby Test Network", etc. By passing the proper locator and
   * "kovan" as partial text, you can interact with that item in particular.
   *
   * @param elementLocator
   * @param partialText
   */
  async findElementByPartialTextMatch(
    elementLocator: Locator,
    partialText: string
  ) {
    return findItemByPartialTextMatch(
      this.browser,
      elementLocator,
      partialText,
      this.locatorTimeout
    );
  }

  /**
   * Finds an element in a list of nodes by an exact text match.
   * For example, you have a list of networks "Main Network", "Kovan Test Network",
   * "Rinkeby Test Network", etc. By passing the proper locator and
   * "Main Network" as partial text, you can interact with that item in particular.
   *
   * @param elementLocator
   * @param partialText
   */
  async findElementByExactTextMatch(elementLocator: Locator, text: string) {
    return findItemByExactTextMatch(
      this.browser,
      elementLocator,
      text,
      this.locatorTimeout
    );
  }

  /****************************************************************
   * Private API
   ****************************************************************/

  /**
   * Browses to a given URL in the current window.
   *
   * @param url
   */
  private async navigateTo(url: string) {
    await this.browser.navigate().to(url);
  }

  /**
   * Redirects the browser to chrome://inspect/#extensions, to wait until
   * the MetaMask extension is listed as available.
   */
  private async waitForExtensionsList() {
    await this.navigateTo(EXTENSION_INSPECTOR);

    const extensionsList = await this.getElement(EXTENSION_LIST_SELECTOR);

    await this.browser.wait(
      until.elementTextContains(extensionsList, "MetaMask")
    );
  }

  /**
   * Stores a reference about the scope of further interactions.
   * Used to properly switch the driver's context when orchestrating
   * actions involving Metamask, popups and the Wallet UI.
   *
   * @param newContext
   */
  private async updateContext(newContext: TestBrowserContext) {
    this.currentContext = newContext;

    if (newContext !== TestBrowserContext.CounterfactualWallet) {
      await this.browser.switchTo().window(this.handlesByContext[newContext]);
    } else {
      const { pluginIframe } = MAIN_SCREEN_SELECTORS;
      const iframe = await this.getElement(pluginIframe);

      await this.browser.switchTo().frame(iframe);
    }
  }

  /**
   * Opens a new tab in the browser by executing `window.open()` in the
   * current window's execution context, returning the new window's
   * handle.
   *
   * By default, it'll wait for a second *before* opening the window
   * and delay further execution for 100ms *after* opening the window.
   *
   * Whle opening a window can be done immediately, it is recommended
   * to add some delay after opening the window so Selenium has enough
   * time to detect the new window handle.
   *
   * @param millisecondsToWaitBeforeOpening
   * @param millisecondsToWaitAfterOpening
   */
  private async openNewTab(
    millisecondsToWaitBeforeOpening = 1000,
    millisecondsToWaitAfterOpening = 100
  ) {
    await this.browser.sleep(millisecondsToWaitBeforeOpening);

    await this.browser.executeScript(`window.open('','popup_${Date.now()}');`);

    await this.browser.sleep(millisecondsToWaitAfterOpening);

    const windowHandles = await this.browser.getAllWindowHandles();

    return windowHandles.pop() as string;
  }
}
