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

it("logs in with an existing account, goes to /balance, makes a withdraw", async () => {
  const {
    loginButton,
    balanceContainer,
    balanceText
  } = LAYOUT_HEADER_SELECTORS;
  const { withdrawAmountInput } = ACCOUNT_BALANCE_SELECTORS;

  StateCollector.dumpInto(browser);

  await browser.switchToWallet();
  await browser.clickOnElement(loginButton);
  await browser.signTransaction();
  await browser.waitForLoginToBeFinished();
  await browser.clickOnElement(balanceContainer);
  await browser.waitForElement(withdrawAmountInput);
  await browser.fillAccountWithdrawFormAndSubmit();

  expect(await browser.getCurrentScreenName()).toEqual(
    CounterfactualScreenName.Channels
  );
  expect(await browser.getTextFromElement(balanceText)).toEqual("0.1 ETH");
});

afterAll(async () => {
  await browser.closeBrowser();
});
