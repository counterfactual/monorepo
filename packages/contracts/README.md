# Counterfactual Smart Contracts <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" />

#### ⚠️️️ This is _highly_ experimental software, do not run in production! ️️⚠️️️

## Architecture Overview

Counterfactual provides a small and clean API for application developers to program against. It is designed to allow a clean separation of application-specific code written by an app developer and framework written by us. Application-specific code is isolated in a stateless contract. Examples of these contracts can be seen in the repository `cf-apps`.

When disputes occur, an instance of the contract [`StateChannel.sol`](./contracts/StateChannel.sol) is placed on chain together with a small amount of state. This contract also manages the dispute flow. Upon resolution of a dispute, apps return a struct called `Transfer.Details` to determine who gets the value-at-stake, and for common types of value-at-stake, the framework enforces a maximum amount of value transferable.

State deposit is stored in a [multisig wallet](./contracts/MinimumViableMultisig.sol). Apps are installed by signing [commitments](./contracts/delegateTargets/ConditionalTransfer.sol) from the multisig. Deterministic addressing for counterfactually instantiated objects is provided through a [registry](`./contracts/Registry.sol`).

## Contributing

Counterfactual is an open-source project. Development happens in the open on GitHub, and we welcome bugfixes and improvements from the community.

### Security

If you find a security issue, please contact us at security@counterfactual.com.
