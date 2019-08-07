import { WELCOME_SCREEN_SELECTORS } from "../utils/counterfactual-wallet-selectors";
import { TestBrowser } from "../utils/test-browser";
import { CounterfactualScreenName } from "../utils/types";

jest.setTimeout(100000);

let browser: TestBrowser;

beforeAll(async () => {
  browser = new TestBrowser();
  await browser.start();
  await browser.prepare("kovan");
});

it("registers a new account and goes to /channels", async () => {
  const { setupCounterfactualButton } = WELCOME_SCREEN_SELECTORS;

  await browser.switchToWallet();

  await browser.clickOnElement(setupCounterfactualButton);

  await browser.fillAccountRegistrationFormAndSubmit(
    "teapot",
    "i.am.a@tea.pot"
  );

  await browser.fillAccountDepositFormAndSubmit();

  expect(await browser.getCurrentScreenName()).toEqual(
    CounterfactualScreenName.Channels
  );
});

afterAll(async () => {
  await browser.closeBrowser();
});
