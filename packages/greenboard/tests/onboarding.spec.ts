import { WELCOME_SCREEN_SELECTORS } from "../utils/counterfactual-wallet-selectors";
import { TestBrowser } from "../utils/test-browser";

jest.setTimeout(100000);

it("registers a new account", async () => {
  const browser = new TestBrowser();
  const { setupCounterfactualButton } = WELCOME_SCREEN_SELECTORS;

  await browser.openMetamask();
  await browser.setupMetamask();
  await browser.waitForMetamaskMainScreen();
  await browser.setMetamaskNetwork("kovan");
  await browser.openCounterfactualWallet();
  await browser.authorizeWallet();

  await browser.switchToWallet();

  await browser.clickOnElement(setupCounterfactualButton);

  await browser.fillAccountRegistrationFormAndSubmit(
    "teapot",
    "i.am.a@tea.pot"
  );

  await browser.fillAccountDepositFormAndSubmit("0.1");
});
