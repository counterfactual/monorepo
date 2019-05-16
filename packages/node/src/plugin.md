# Summary

A **plugin** to the `Node` is a class which defines how the `Node` will react to installation and state proposal events for a particular App (defined by its `appDefinitionAddr`). By **registering a plugin** on the `Node`, mapping is created from an App to functions `onProposedInstall` and `onProposedNewState` which the `Node` will use for that App when given new installation requests and state updates respectively. The functions simply return `boolean` values indicating whether or not the `Node` should countersign a request for either of these events.

## Flow: Node's interaction with the Plugin

- ### How is a plugin registered?

  - The Node will have a method on it called `registerPlugin` which accepts
    - the name of an App (possibly an AppInstanceId so the possibiliy of different plugins being registered for the same App remains open)
    - PluginParams: TBD (parameters such as which providers to use for uninstalling?)
    - The plugin instance that executes the calls for the above described methods
  - The Node then keeps a mapping of AppInstances to pluginID so that it can execute the relevant plugin's functions per AppInstance as described above

- ### Where in the Node does a plugin's `onProposedInstall` get called?

  - This is called when the counter party receives a proposal. The plugin is looked up via the mapping that the Node holds. The parameters of this proposal are relayed to the plugin, which executes its logic to determine whether the proposal should be accepted and the AppInstance be installed.

- ### Where in the Node does a plugin's `onProposedNewState` get called?
  - When the counter party receives a new state, the parameters can be relayed to the plugin so it can determine whether the new state can be accepted or not.

* ### Implementation strategy
  - The first use case driving the implementation of this feature is the FreeBalance being updateable to provide the functionality of a bidirectional payment app.
  - More specifically, in a **payment channel app** the `onProposedInstall` function will verify that the `aliceBalanceDecrement` and `bobBalanceDecrement` fields of the `InstallParams` map correctly to the `aliceBalance` and `bobBalance` values in the `initialState` parameter of the `InstallParams`. In the case of a newly proposed state, the `onProposedNewState` method will determine if `aliceBalance` (for the case of Alice) is greater in the new state than in the previously signed state.

Open questions:

- what kind of access does a plugin have to the Node?
- where are plugins stored? we need a plugin registry
- Should there be an optional uninstall method on the plugin
  - This means for example that the resolution timing could be overridden by the plugin to use different providers
- How does auto-challenging work via plugins? Could PISA functionality be implemented as a plugin?
