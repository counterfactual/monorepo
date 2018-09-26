## Setup Protocol

The very first protocol every GSC must run is the Setup Protocol. As the name suggests, its purpose is to setup the counterfactual state so that later protocols can execute properly. Specifically, it exchanges a commitment allowing a special type of application to withdraw funds from the multisig. We call this application the Free Balance contract, representating the available funds for any new application to be installed into the GSC.

Completing the Setup Protocol transitions the counterfactual state to

![setup](../images/setup.png)

**Handshake:**

|A        |B          |
|-        |-          |
|`Setup`  |           |
|         |`SetupAck` |

**Message:**

```typescript
let Setup = {
  protocol: 0x01,
  multisig: address,
  data: None,
  fromAddress: address,
  toAddress: address,
  seq: 0,
  signature: signature,
}
let SetupAck = {
  protocol: 0x01,
  multisig: address,
  data: None,
  fromAddress: address,
  toAddress: address,
  seq: 1,
  signature: signature,
}

Setup.fromAddress === SetupAck.toAddress;
Setup.toAddress === SetupAck.fromAddress;
```

Unlike the rest of the protocols, there is no extra message data for the Setup protocol because it is deterministic. It always installs a Free Balance contract with starting balances of 0, and so no extra data is required to be passed in from outside the context of the protocol execution.

### Commitment

TBD