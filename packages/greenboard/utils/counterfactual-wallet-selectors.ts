import { By } from "selenium-webdriver";

export const WELCOME_SCREEN_SELECTORS = {
  setupCounterfactualButton: By.css("[data-test-selector='setup-button']")
};

export const ACCOUNT_REGISTRATION_SELECTORS = {
  usernameInput: By.css("[data-test-selector='username-input']"),
  emailInput: By.css("[data-test-selector='email-input']"),
  createAccountButton: By.css("[data-test-selector='register-button']")
};

export const ACCOUNT_DEPOSIT_SELECTORS = {
  formTitle: By.css(".widget-header"),
  amountInput: By.css("[data-test-selector='deposit-amount-input']"),
  proceedButton: By.css("[data-test-selector='deposit-button']")
};

export const LAYOUT_HEADER_SELECTORS = {
  loginButton: By.css("[data-test-selector='login-button']"),
  logoContainer: By.css(".header > .header-content > .logo-container"),
  accountContainer: By.css("header > .header-content .account-container"),
  userNameText: By.css("[data-test-selector='info-user'] .info-content"),
  balanceContainer: By.css("[data-test-selector='info-balance']"),
  balanceText: By.css("[data-test-selector='info-balance'] .info-content")
};

export const ACCOUNT_BALANCE_SELECTORS = {
  depositAmountInput: By.css("[data-test-selector='deposit-amount-input']"),
  depositProceedButton: By.css("[data-test-selector='deposit-button']"),
  withdrawAmountInput: By.css("[data-test-selector='withdraw-amount-input']"),
  withdrawProceedButton: By.css("[data-test-selector='withdraw-button']")
};
