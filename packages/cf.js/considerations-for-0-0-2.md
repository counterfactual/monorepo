# missing features of v0.0.2

- need a way to provide a `timeout` during the install flow
    - argument to `proposeInstall`?
    - attribute of the manifest.json
- currently, the user's address is never being set
    - provide as an argument: `new Client(nodeProvider, address)`
    - fetch it from the wallet through an `async init` method?
- do dapp's specify the deposit? if so, `proposeInstall` and `install` need a deposit arg
- should the `terms` be set during `install` instead of `proposeInstall`, since we won't know the full limit of the terms until both parties have deposited?
- should the dapp be able to provide an initial state during `install`? or do we expect dapps to immediately perform an `updateState`?
- in the legacy api, we provide uninstall with `{ peerABalance, peerBBalance }` to determine how much eth to deposit to their respective accounts. should we support that with `0.0.2`? or is this handled in another way now?
- how do we support `proposeInstall` before it's implemented node-side? there's a communication issue here, where we need to get the proposal to the counterparty. how do we handle peer-to-peer communications outside of node notifications?
