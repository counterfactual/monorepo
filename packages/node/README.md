## Protocols

The Node contains a TypeScript implementation of the [Counterfactual protocol](https://github.com/counterfactual/specs/blob/master/v0/protocols.md). It is responsible for executing the Counterfactual protocols [specified here](https://specs.counterfactual.com) and producing correctly constructed signed commitments that correspond to state transitions of the users' state channels.

The specific design philosophy it adopts is the middleware pattern. That is, all of these protocols are naturally broken down into steps, for each of which there is a middleware responsible for executing that step.

Given this design, it's easy to extend the machine to support additional protocols, replace a default middleware with an alternative implementation, and for the machine to rely on yet delegate more advanced logic to external services.

Some specific examples of this include:

- delegating to a signing module that verifies whether a given action is safe to sign & countersign
- storing state commitments (delegating to an arbitrary, possibly non-local service implementing a desired interface)
- implementing a custom Write-Ahead-Log to tweak performance/security properties
