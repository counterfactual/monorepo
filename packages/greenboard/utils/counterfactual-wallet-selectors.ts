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
  amountInput: By.css("[data-test-selector='amount-input']"),
  proceedButton: By.css("[data-test-selector='deposit-button']")
};

export const LAYOUT_HEADER_SELECTORS = {
  logoContainer: By.css(".header > .header-content > .logo-container")
};
