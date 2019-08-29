import {
  LAYOUT_HEADER_SELECTORS,
  WELCOME_SCREEN_SELECTORS
} from "../utils/counterfactual-wallet-selectors";
import {
  COUNTERFACTUAL_USER_USERNAME,
  TestBrowser
} from "../utils/test-browser";
import { CounterfactualScreenName, MetamaskFlowType } from "../utils/types";

jest.setTimeout(100000);

let browser: TestBrowser;

beforeAll(async () => {
  browser = new TestBrowser();
  await browser.start();
  await browser.prepare(MetamaskFlowType.NewUser);
});

it("registers a new account and goes to /channels", async () => {
  const { setupCounterfactualButton } = WELCOME_SCREEN_SELECTORS;
  const { userNameText } = LAYOUT_HEADER_SELECTORS;

  await browser.switchToWallet();

  await browser.clickOnElement(setupCounterfactualButton);

  await browser.fillAccountRegistrationFormAndSubmit();
  await browser.fillAccountDepositFormAndSubmit();

  expect(await browser.getCurrentScreenName()).toEqual(
    CounterfactualScreenName.Channels
  );

  expect(await browser.getTextFromElement(userNameText)).toEqual(
    COUNTERFACTUAL_USER_USERNAME
  );
});

afterAll(async () => {
  await browser.collectMetamaskLocalStorage();
  await browser.closeBrowser();
});
