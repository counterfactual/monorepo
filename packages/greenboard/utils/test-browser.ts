import { resolve } from "path";
import {
  Builder,
  Locator,
  until,
  WebDriver,
  WebElement,
  WebElementPromise
} from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome";
import {
  EXTENSION_LIST_SELECTOR,
  METAMASK_EXTENSION_URL_SELECTOR
} from "./chrome-selectors";
import { ACCOUNT_REGISTRATION_SELECTORS } from "./counterfactual-wallet-selectors";
import {
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
  MetamaskNetwork,
  MetamaskOptions,
  MetamaskTransaction,
  TestBrowserContext
} from "./types";

export const EXTENSION_INSPECTOR = "chrome://inspect/#extensions";

/**
 * Creates a Chrome browser, with a build of the Metamask + CF extension.
 */
export class TestBrowser {
  constructor(
    private readonly browser: WebDriver = {} as WebDriver,
    private homeUrl: string = "",
    private popupUrl: string = "",
    private previousContext?: TestBrowserContext,
    private currentContext?: TestBrowserContext
  ) {
    const extension = resolve(__dirname, "../extension/metamask");

    const browserFactory = new Builder().forBrowser("chrome");

    const options = new Options();
    options.addArguments(
      `--load-extension=${extension}`,
      `--disable-web-security`,
      `--user-data-dir=/tmp/greenboard`
    );

    this.browser = browserFactory
      .setChromeOptions(options)
      .setAlertBehavior("ignore")
      .build();
  }

  /****************************************************************
   * Metamask Automations API
   ****************************************************************/

  /**
   * Opens the Metamask extension page in the current window. It'll automatically
   * lookup the extension ID from the Extensions Inspector and save the `home`
   * and `popup` URLs for later usage. If such URLs are already defined,
   * it'll skip the lookup and navigate to `homeUrl`.
   */
  async openMetamask() {
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
    const tabs = await this.browser.getAllWindowHandles();

    await this.browser.switchTo().window(tabs[0]);

    this.updateContext(TestBrowserContext.MetamaskMain);
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
    await this.browser.switchTo().window(popupHandle);

    await this.navigateTo(this.popupUrl);

    this.updateContext(TestBrowserContext.MetamaskPopup);

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

    await this.close();

    this.updateContextWithPreviousContext();
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

    const { pluginIframe } = MAIN_SCREEN_SELECTORS;
    const iframe = await this.getElement(pluginIframe);

    await this.browser.switchTo().frame(iframe);

    this.updateContext(TestBrowserContext.CounterfactualWallet);
  }

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
  }

  /****************************************************************
   * Browser Generic API
   ****************************************************************/

  /**
   * Closes the current window.
   */
  async close() {
    await this.browser.close();
  }

  /**
   * Returns a list of elements found by the given selector.
   *
   * @param selector
   */
  getElements(selector: Locator): Promise<WebElement[]> {
    return this.browser.findElements(selector);
  }

  /**
   * Returns a single element found by the given selector.
   *
   * @param selector
   */
  getElement(selector: Locator): WebElementPromise {
    return this.browser.wait(until.elementLocated(selector));
  }

  /**
   * Waits for an element to be located in the DOM tree.
   *
   * @param selector
   */
  async waitForElement(selector: Locator) {
    await this.browser.wait(until.elementLocated(selector));
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
   * Types a given text into the element found by the selector.
   *
   * @param selector
   */
  async getTextFromElement(selector: Locator) {
    return this.getElement(selector).getText();
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
      partialText
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
    return findItemByExactTextMatch(this.browser, elementLocator, text);
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
    this.previousContext = this.currentContext;
    this.currentContext = newContext;
  }

  /**
   * Return the scope to the previous reference.
   * Used, for example, to switch context after closing a Metamask
   * Popup. The context can be either Metamask or the Wallet UI.
   * Storing `previousContext` allows to switch to the correct context.
   *
   * @param newContext
   */
  private async updateContextWithPreviousContext() {
    const previousContext = this.previousContext;

    this.previousContext = this.currentContext;
    this.currentContext = previousContext;
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

    await this.browser.executeScript("window.open('');");

    await this.browser.sleep(millisecondsToWaitAfterOpening);

    const windowHandles = await this.browser.getAllWindowHandles();

    return windowHandles.pop() as string;
  }
}
