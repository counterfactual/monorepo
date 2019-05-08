## Protocols

The Node contains a TypeScript implementation of the [Counterfactual protocol](https://github.com/counterfactual/specs/blob/master/v0/protocols.md). It is responsible for executing the Counterfactual protocols [specified here](https://specs.counterfactual.com) and producing correctly constructed signed commitments that correspond to state transitions of the users' state channels.

The main areas of interest with this implementation are:

- `src/machine/instruction-executor.ts`: This is the entry point for running a protocol.
- `src/protocol` is where all the protocols are implemented
- `src/ethereum` is where the structure of the commitments is placed. It's under this folder as these commitments adhere to the Ethereum network's interface for transactions.

The specific design philosophy for this implementation is the middleware pattern. That is, all of these protocols are naturally broken down into steps, for each of which there is a middleware responsible for executing that step.

Given this design, it's easy to extend this implementation to support additional protocols, replace a default middleware with an alternative implementation, and for the machine to rely on yet delegate more advanced logic to external services.

Some specific examples of this include:

- delegating to a signing module that verifies whether a given action is safe to sign & countersign
- storing state commitments (delegating to an arbitrary, possibly non-local service implementing a desired interface)
- implementing a custom Write-Ahead-Log to tweak performance/security properties
