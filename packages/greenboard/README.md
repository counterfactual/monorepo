# 💚 Greenboard

An automated end-to-end test suite for Counterfactual, built with Selenium.

## How does it work?

This package is executed from the monorepo's root, via `yarn test:e2e`.

## How do I write a new scenario?

- Add a `.spec.ts` file into the `tests/` folder.
- Instantiate the `TestBrowser` class and start an instance.
- Add the following steps:

```ts
await browser.openMetamask();
await browser.setupMetamask();
await browser.waitForMetamaskMainScreen();
await browser.setMetamaskNetwork("kovan");
await browser.openCounterfactualWallet();
await browser.authorizeWallet();
```

This will preconfigure Metamask and connect the Wallet UI with the Ethereum provider.

Then, use the [TestBrowser's API](./utils/test-browser.ts) to implement your scenario.

## Adding selectors

TBD

## TestBrowser API

TBD
