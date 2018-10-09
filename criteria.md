## Criteria

This is a list of criteria for proposed protocol designs, i.e., predicates that a protocol design either satisfies or does not.

### One round trip communication

In a 2-party channel, 2 messages suffices to safely change the counterfactual state of the GSC 
    - to install an application,
    - to uninstall an application, and 
    - to update the state of an application

### Constant sized communication

The total size of messages that we need to exchange to do the following has a constant size, in particular, independent of number of active or historical apps.
    - to install an application,
    - to uninstall an application, and 
    - to update the state of an application

Note: this criteria does not preclude a "cleanup phase" following the one round trip

### O(1) response

It is possible to arrive at a state where any stale-state-griefing attack can be responded to with a single transaction of constant size, in particular, independent of number of active or historical apps.

