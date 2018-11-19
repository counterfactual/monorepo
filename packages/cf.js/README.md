# [CF.js](https://counterfactual.com) <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" />

CF.js is a library that enables web applications to communicate with a user's Counterfactual-enabled wallet. It allows developers to install and interact with apps on the Counterfactual network.

- Minimal Interface — CF.js exposes a simple set of classes and methods to get the job done easily and quickly, while still allowing for complex behavior.
- Secure — CF.js never handles a user's money directly: any request to move money into or out of an app is handled by the user's wallet software and has to be manually approved by the user. That means you don't have to worry about mishandling a user's funds.
- Powerful — Write complex applications that handle real assets on the Ethereum blockchain with the performance of the web stack.

### **Note: The API for CF.js is still highly experimental and is subject to change until a 1.0.0 version is available. This is an active work in progress and the docs will be made available soon.**

## Experimental Usage

**Make sure you have Yarn v1.10.1**. Refer to [Yarn's installation guide](https://yarnpkg.com/lang/en/docs/install/) for setup instructions for your operating system.

To install the dependencies:

```shell
yarn
```

### Building the package

To build the cf.js package:

```shell
yarn build
```

## API Reference
[Found here](API_REFERENCE.md)
