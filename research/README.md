# Research

## Desired Properties

Counterfactual has been designed to attain the following properties.

### Minimized on-chain footprint

We don’t want to put anything on the chain that doesn’t need to be. In our designs, we have aimed to make the only necessary on-chain object for a state channel to be a generic multisignature wallet.

### Maximized privacy

We want to achieve a level of privacy where state channel operations are indistinguishable from other common types of on-chain activities. Using a state channel should not reveal any information about the applications that are being used, the state being used within them, or even the fact that a state channel is being used at all. To achieve this property, we assume that the on-chain component is a generic multisignature wallet which looks the same as any other multisignature wallet on Ethereum.

### Ease-of-use

We want channels that can be easily incorporated into new applications without the requirement for those developers to also be state channel experts. For this property we have defined an abstraction for state channel applications that we call "Apps". These "Apps" are simple stateless contracts which just define the state machine for an application including valid transitions and turn-taking logic. We restrict the kinds of applications that are written to be the kinds that fit within the [limitations](#limitations) of state channels.

### Parallel operations

We want to see support for multiple parallel operations inside of a single channel that do not interfere with each other. We have designed "Apps" to be kinds of running off-chain applications that have state assigned to them completely independently of each other. Typical operations like installing new applications, uninstalling old applications, and updating applications are all parallelizable operations with respect to other apps using the [Counterfactual protocol](/protocols).

### Upgradeability

We want to support deploying or upgrading channel designs without requiring the user to make a single on-chain operation. There are multiple ways that we are able to achieve this and that we are designing for. For the purposes of _trustless_ off-chain upgradability, we are able to support counterfactually instantiated smart contracts as applications. To upgrade a contract trustlessly, state channel participants simply agree to a new version of bytecode their applications pertains to and move on with that. With trust, state channel participants can use an application that is defined using [ZeppelinOS's upgradeable contracts](https://docs.zeppelinos.org/docs/building.html).

### Standardized

We want to establish clear standards for how all of these generalized state channels will fit together into a global, multi-blockchain network where any user can easily connect to any other. To achieve this goal, we've worked closely with great researchers from [Celer](https://celer.network), [Magmo](https://magmo.com), [Ethereum Research](eth.sg) and several others. We hope to amplify these efforts to work towards blockchain standards for off-chain channelized applications more broadly.

## Limitations

1. **Conflict-free data structures.** Since state updates happen off-chain in state channels, there is a need to replicate the ordering property of a blockchain through a conflict-free data structure. In Counterfactual, we currently support turn-based state machines where the participant authorized to take their take (an action) is defined as a function of the state of an `App`.

2. **Public auditability.** State channel applications cannot declare the state within the application to the public in a way that can be considered by the public as the latest state. For example, there is no equivalent to Etherscan for off-chain state since it is always possible for the participants of a state channel to falsify their claims.