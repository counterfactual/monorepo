import { LAYOUT_HEADER_SELECTORS } from "../utils/counterfactual-wallet-selectors";
import StateCollector from "../utils/state-collector";
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
  await browser.prepare(MetamaskFlowType.ReturningUser);
});

it("logs in with an existing account and goes to /channels", async () => {
  const { loginButton, userNameText, balanceText } = LAYOUT_HEADER_SELECTORS;

  StateCollector.dumpInto(browser);

  await browser.switchToWallet();
  await browser.clickOnElement(loginButton);
  await browser.signTransaction();
  await browser.waitForLoginToBeFinished();

  expect(await browser.getCurrentScreenName()).toEqual(
    CounterfactualScreenName.Channels
  );

  expect(await browser.getTextFromElement(userNameText)).toEqual(
    COUNTERFACTUAL_USER_USERNAME
  );

  expect(await browser.getTextFromElement(balanceText)).toEqual("0.1 ETH");
});

afterAll(async () => {
  await browser.closeBrowser();
});
