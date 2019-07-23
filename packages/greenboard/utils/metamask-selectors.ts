import { By, Locator, promise, WebDriver } from "selenium-webdriver";
import { MetamaskNetwork, MetamaskTransaction } from "./types";

export const GENERIC_SELECTORS = {
  body: By.tagName("body")
};

export const FIRST_TIME_FLOW_SELECTORS = {
  getStartedButton: By.css(".first-time-flow__button"),
  importFromSeedPhraseButton: By.css(".first-time-flow__button"),
  iAgreeButton: By.css(".btn-primary"),
  seedPhraseInput: By.css(".first-time-flow__textarea"),
  passwordInput: By.id("password"),
  confirmPasswordInput: By.id("confirm-password"),
  acceptTermsAndConditionsCheckbox: By.css(".first-time-flow__checkbox"),
  importSubmitButton: By.css(".first-time-flow__button"),
  endOfFlowScreen: By.css(".end-of-flow"),
  allDoneButton: By.css(".first-time-flow__button")
};

export const findItemByPartialTextMatch = async (
  driver: WebDriver,
  itemLocator: Locator,
  partialText: string,
  timeout: number = 3000
) => {
  return new Promise(async (resolve, reject) => {
    setTimeout(() => reject("Timeout"), timeout);

    const items = await driver.findElements(itemLocator);

    return resolve(
      promise.filter(items, async item => {
        const text = await item.getText();
        return text.toLowerCase().includes(partialText);
      })
    );
  });
};

export const findItemByExactTextMatch = async (
  driver: WebDriver,
  itemLocator: Locator,
  matchWithText: string,
  timeout: number = 3000
) => {
  return new Promise(async (resolve, reject) => {
    setTimeout(() => reject("Timeout"), timeout);

    const items = await driver.findElements(itemLocator);

    return resolve(
      promise.filter(items, async item => {
        const text = await item.getText();
        return text === matchWithText;
      })
    );
  });
};

const networkMenuItemFinder = (networkName: MetamaskNetwork) => async (
  driver: WebDriver
) =>
  findItemByPartialTextMatch(
    driver,
    MAIN_SCREEN_SELECTORS.networkMenuListItem,
    networkName
  );

const transactionListItemFinder = (
  transactionType: MetamaskTransaction
) => async (driver: WebDriver) =>
  findItemByExactTextMatch(
    driver,
    MAIN_SCREEN_SELECTORS.transactionListItem,
    TRANSACTION_LIST_ITEM_TEXT_LOCATORS[transactionType]
  );

export const MAIN_SCREEN_SELECTORS = {
  counterfactualToken: By.css(
    "#app-content > div > div.main-container-wrapper > div > div > div.wallet-view.flex-column > div:nth-child(6) > div > div > div > div.currency-display-component.token-amount"
  ),
  pluginIframe: By.tagName("iframe"),
  mainScreenContainer: By.css(".account-and-transaction-details"),
  networkMenuButton: By.css(".network-component"),
  networkMenuList: By.css(".menu-droppo"),
  networkMenuListItem: By.css(".menu-droppo .dropdown-menu-item"),
  networkMenuItem: networkMenuItemFinder,
  transactionList: By.css(".transaction-list"),
  transactionListItem: By.css(".transaction-list-item__action"),
  transactionItem: transactionListItemFinder
};

export const NETWORK_SELECTORS: {
  [key in MetamaskNetwork]: Locator;
} = {
  main: By.css(".ethereum-network"),
  ropsten: By.css(".ropsten-test-network"),
  kovan: By.css(".kovan-test-network"),
  rinkeby: By.css(".rinkeby-test-network"),
  goerli: By.css(".goerli-test-network"),
  localhost: By.css(".network-component[title='localhost']"),
  custom: By.css(".networks-tab__network-form")
};

export const TRANSACTION_LIST_ITEM_TEXT_LOCATORS: {
  [key in MetamaskTransaction]: string;
} = {
  signatureRequest: "Signature Request",
  deposit: "Deposit"
};

export const NOTIFICATION_SELECTORS: {
  [key in MetamaskTransaction]: Locator;
} = {
  signatureRequest: By.css(".request-signature__container"),
  deposit: By.css(".confirm-page-container-content")
};

export const REQUEST_SIGNATURE_SELECTORS = {
  signButton: By.css(".request-signature__footer__sign-button")
};

export const DEPOSIT_SELECTORS = {
  confirmButton: By.css(".page-container__footer-button.btn-primary")
};

export const WALLET_AUTHORIZATION_MODAL_SELECTORS = {
  modalContainer: By.css(".provider-approval-container"),
  modalPrimaryButton: By.css(".btn-primary")
};
