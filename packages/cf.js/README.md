# CF.js
**Counterfactual Web Library**
 
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [TODO:NPM PACKAGE]() [![CircleCI](https://circleci.com/gh/counterfactual/monorepo.svg?style=svg&circle-token=adc9e1576b770585a350141b2a90fc3d68bc048c)](https://circleci.com/gh/counterfactual/monorepo)

## CF.js

CF.js is a library that enables web applications to communicate with a user's Counterfactual-enabled wallet. It allows developers to install and interact with apps on the Counterfactual network.

- Minimal Interface — CF.js exposes a simple set of classes and methods to get the job done easily and quickly, while still allowing for complex behaviour.
- Secure — CF.js never handles a user's money directly: any request to move money into or out of an app is handled by the user's wallet software and has to be manually approved by the user.  That means you don't have to worry about mishandling a user's funds.
- Powerful — Write complex applications that handle real assets on the Ethereum blockchain with the performance of the web stack.

## Getting started

To add CF.js to your Node-based project, run

```bash
yarn add @counterfactual/cfjs
# OR
npm i --save @counterfactual/cfjs
```

In your code, you can import and use CF.js (using ES6 modules):

```typescript
import * as cf from "@counterfactual/cfjs";
```

Or if you're using CommonJS modules
```typescript
const cf = require("@counterfactual/cfjs");
```

A user's wallet injects an object called "counterfactualProvider" into the browser so that in-browser apps can communicate with it.

Using CF.js, you can use it to connect to the wallet as follows:

```typescript
const client = new cf.Client(window.counterfactualProvider);
```

## Example of Simple Payment Channel
```typescript
import * as cf from "@counterfactual/cfjs";
import { SimplePaymentChannel } from "@counterfactual/sample-apps";

const counterpartyAddress = "0xbb..";

const channel = new cf.Client(window.counterfactualProvider).connect(counterpartyAddress);
console.log(await channel.getBalance()) // 1.0 ETH

const myAddress = await channel.getAddress();
const app = await channel.install({
  definition: SimplePaymentChannel,
  deposits: {
    [myAddress]: {ether: "1.0"}
  },
  initialState: {
     source: myAddress,
     destination: counterpartyAddress
  }
});
await app.commitAction({
  sendValue: "0.5"
});
await app.uninstall();

console.log(await channel.getBalance()) // 0.5 ETH
```

## API Documentation

API documentation can be found on [GitBook](https://counterfactual.gitbook.io/monorepo/packages/cf.js).

## Contributing

If you have a question or comment, [join us on Discord]([https://discord.gg/w6VmMhP](https://discord.gg/w6VmMhP)).

If you want to get really involved then send an email to [dev@counterfactual.com](mailto:dev@counterfactual.com)

## Roadmap

TBD 

