import { By } from "selenium-webdriver";

export const WELCOME_SCREEN_SELECTORS = {
  setupCounterfactualButton: By.css("[data-test-selector='button']")
};

export const ACCOUNT_REGISTRATION_SELECTORS = {
  usernameInput: By.css("[data-test-selector='username']"),
  emailInput: By.css("[data-test-selector='email']"),
  createAccountButton: By.css("[data-test-selector='button']")
};
