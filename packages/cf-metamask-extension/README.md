# 🦊 Custom MetaMask Chrome Extension

As part of our integration work with the broader dapp ecosystem, we have developed a custom fork of MetaMask that injects the [@counterfactual/node](../packages/node) package into the Chrome extension. With this injection it is possible to navigate to a URL in the Chrome browser that uses the [@counterfactual/cf.js](../packages/cf.js) library and have it function as-intended. This functionality is the first step in making state channels a more accessible technique for dapp developers to use.

In the future, we hope to bring this functionality into the production build of MetaMask for all users to benefit from. In the meantime, however, it can be a very useful tool in developing Counterfactual-enabled dapps in the browser.

## Installation

### Download the extension

The extension can be downloaded from the current integration branch on [prototypal/metamask-extension](https://github.com/prototypal/metamask-extension/blob/alon/cfnode-background/cf_builds/chrome.zip) (click to download the zipped extension).

### Add a developer Chrome profile

It is recommended to test this extension in a separate profile in Chrome so that it doesn't override your actual MetaMask extension that you use in your day to day browser usage. If you're already running a custom Chrome build you can ignore this step.

1. On your computer, open Chrome.
2. At the top right, click **Profile**.
3. Click **Manage people**.
4. Click **Add person** ([screenshot](http://prntscr.com/nl5hxf)).
5. Choose a name and a photo.

### Load the extension into Chrome

1. Open the [**Extensions**](chrome://extensions/) page ([screenshot](http://prntscr.com/nl5lri)).
2. Toggle **Developer Mode** to **on** ([screenshot](http://prntscr.com/nl5miy)).
3. Select **Load unpacked** choose the folder that you unzipped the extension earlier ([screenshot](http://prntscr.com/nl5njh)).

The MetaMask Counterfactual extension is now loaded.

## Setup

### Set up MetaMask for development

1. Click on the extension in your toolbar and create a MetaMask account as you would normally.
2. Switch to the Kovan testnet (presently the playground only supports Kovan).
3. Click on the ••• menu and select **Expand View**

### Add Counterfactual as a plugin inside of MetaMask

1. Click on the `[ADDPLUGINS]` button ([screenshot](http://prntscr.com/nl5u3g)).
2. Click on the `ADD PLUGIN` button ([screenshot](http://prntscr.com/nl5udl)).
3. Click on the `CF Plugin` button. You should see the CF logo and `"dummyBalance" ETH` ([screenshot](http://prntscr.com/nl5ve7)).

## Usage

### Playground

Presently, the custom build is loading the [@counterfactual/playground](../packages/playground) project as the main UI inside of the extension. It will appear inside of an `iframe` inside the MetaMask Chrome extension's extended view itself in place of the transactions screen that you would see normally.

From here, you can use the playground environment as you would normally (e.g., as is currently on [playground.counterfactual.com](https://playground.counterfactual.com)). Note however that existing accounts that may exist on the playground demo site cannot be used within the extension because a new `Node` object is instantiated inside of the extension once installed.
