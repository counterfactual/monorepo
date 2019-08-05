import {
  ACCOUNT_BALANCE_SELECTORS,
  LAYOUT_HEADER_SELECTORS
} from "../utils/counterfactual-wallet-selectors";
import StateCollector from "../utils/state-collector";
import { TestBrowser } from "../utils/test-browser";
import { CounterfactualScreenName, MetamaskFlowType } from "../utils/types";

jest.setTimeout(100000);

let browser: TestBrowser;

beforeAll(async () => {
  browser = new TestBrowser();
  await browser.start();
  await browser.prepare(MetamaskFlowType.ReturningUser);
});

it("logs in with an existing account, goes to /balance, makes a deposit", async () => {
  const {
    loginButton,
    balanceContainer,
    balanceText
  } = LAYOUT_HEADER_SELECTORS;
  const { depositAmountInput } = ACCOUNT_BALANCE_SELECTORS;

  StateCollector.dumpInto(browser);

  await browser.switchToWallet();
  await browser.clickOnElement(loginButton);
  await browser.signTransaction();
  await browser.waitForLoginToBeFinished();
  await browser.clickOnElement(balanceContainer);
  await browser.waitForElement(depositAmountInput);
  await browser.fillAccountDepositFormAndSubmit();

  expect(await browser.getCurrentScreenName()).toEqual(
    CounterfactualScreenName.Channels
  );
  expect(await browser.getTextFromElement(balanceText)).toEqual("0.2 ETH");
});

afterAll(async () => {
  await browser.closeBrowser();
});
