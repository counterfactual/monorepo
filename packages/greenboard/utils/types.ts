export type MetamaskOptions = {
  seedPhraseValue: string;
  passwordValue: string;
};

export type MetamaskNetwork =
  | "main"
  | "ropsten"
  | "kovan"
  | "rinkeby"
  | "goerli"
  | "localhost"
  | "custom";

export type MetamaskNotification = "requestSignature";

export type MetamaskTransaction = "signatureRequest" | "deposit";

export const enum TestBrowserContext {
  MetamaskMain = "metamask:main",
  MetamaskPopup = "metamask:popup",
  CounterfactualWallet = "counterfactual:wallet"
}

export const enum CounterfactualScreenName {
  Welcome = "welcome",
  OnboardingRegistration = "onboarding:register",
  OnboardingDeposit = "onboarding:deposit",
  Channels = "channels"
}
