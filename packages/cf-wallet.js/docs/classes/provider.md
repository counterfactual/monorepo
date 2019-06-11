[@counterfactual/cf-wallet.js](../README.md) > [Provider](../classes/provider.md)

# Class: Provider

Provides convenience methods for interacting with a Counterfactual node

## Hierarchy

**Provider**

## Index

### Constructors

* [constructor](provider.md#constructor)

### Properties

* [nodeProvider](provider.md#nodeprovider)

### Methods

* [callRawNodeMethod](provider.md#callrawnodemethod)
* [createChannel](provider.md#createchannel)
* [deposit](provider.md#deposit)
* [getFreeBalanceState](provider.md#getfreebalancestate)
* [getOrCreateAppInstance](provider.md#getorcreateappinstance)
* [install](provider.md#install)
* [installVirtual](provider.md#installvirtual)
* [off](provider.md#off)
* [on](provider.md#on)
* [once](provider.md#once)
* [rejectInstall](provider.md#rejectinstall)
* [withdraw](provider.md#withdraw)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new Provider**(nodeProvider: *`INodeProvider`*): [Provider](provider.md)

*Defined in [provider.ts:30](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L30)*

Construct a new instance

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| nodeProvider | `INodeProvider` |  NodeProvider instance that enables communication with the Counterfactual node |

**Returns:** [Provider](provider.md)

___

## Properties

<a id="nodeprovider"></a>

###  nodeProvider

**● nodeProvider**: *`INodeProvider`*

*Defined in [provider.ts:36](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L36)*

NodeProvider instance that enables communication with the Counterfactual node

___

## Methods

<a id="callrawnodemethod"></a>

###  callRawNodeMethod

▸ **callRawNodeMethod**(methodName: *`MethodName`*, params: *`Node.MethodParams`*): `Promise`<`Node.MethodResponse`>

*Defined in [provider.ts:249](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L249)*

Call a Node method

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| methodName | `MethodName` |  Name of Node method to call |
| params | `Node.MethodParams` |  Method-specific parameter object |

**Returns:** `Promise`<`Node.MethodResponse`>

___
<a id="createchannel"></a>

###  createChannel

▸ **createChannel**(owners: *`Address`[]*): `Promise`<`string`>

*Defined in [provider.ts:109](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L109)*

Creates a channel by deploying a multisignature wallet contract.

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| owners | `Address`[] |  The channel's owning addresses |

**Returns:** `Promise`<`string`>
transactionHash for the channel creation

___
<a id="deposit"></a>

###  deposit

▸ **deposit**(multisigAddress: *`Address`*, amount: *`BigNumber`*, notifyCounterparty?: *`boolean`*): `Promise`<`void`>

*Defined in [provider.ts:146](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L146)*

Deposits the specified amount of funds into the channel with the specified multisig address.

*__async__*: 

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| multisigAddress | `Address` | - |  Address of the state channel multisig |
| amount | `BigNumber` | - |  BigNumber representing the deposit's value |
| `Default value` notifyCounterparty | `boolean` | true |  Boolean |

**Returns:** `Promise`<`void`>

___
<a id="getfreebalancestate"></a>

###  getFreeBalanceState

▸ **getFreeBalanceState**(multisigAddress: *`Address`*): `Promise`<`Node.GetFreeBalanceStateResult`>

*Defined in [provider.ts:189](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L189)*

Queries for the current free balance state of the channel with the specified multisig address.

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| multisigAddress | `Address` |  Address of the state channel multisig |

**Returns:** `Promise`<`Node.GetFreeBalanceStateResult`>
GetFreeBalanceStateResult

___
<a id="getorcreateappinstance"></a>

###  getOrCreateAppInstance

▸ **getOrCreateAppInstance**(id: *`AppInstanceID`*, info?: *`AppInstanceInfo`*): `Promise`<[AppInstance](appinstance.md)>

*Defined in [provider.ts:304](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L304)*

Get app instance given its ID. If one doesn't exist, it will be created and its details will be loaded from the Node.

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| id | `AppInstanceID` |  ID of app instance |
| `Optional` info | `AppInstanceInfo` |  Optional info to be used to create app instance if it doesn't exist |

**Returns:** `Promise`<[AppInstance](appinstance.md)>
App instance

___
<a id="install"></a>

###  install

▸ **install**(appInstanceId: *`AppInstanceID`*): `Promise`<[AppInstance](appinstance.md)>

*Defined in [provider.ts:52](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L52)*

Install a non-virtual app instance given its ID.

*__note__*: Installs non-virtual app instances i.e. in a direct channel between you and your peer. For virtual app instances use [installVirtual](provider.md#installvirtual).

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| appInstanceId | `AppInstanceID` |  ID of the app instance to be installed, generated using \[\[AppFactory.proposeInstall\]\] |

**Returns:** `Promise`<[AppInstance](appinstance.md)>
Installed AppInstance

___
<a id="installvirtual"></a>

###  installVirtual

▸ **installVirtual**(appInstanceId: *`AppInstanceID`*, intermediaries: *`Address`[]*): `Promise`<[AppInstance](appinstance.md)>

*Defined in [provider.ts:73](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L73)*

Install a virtual app instance given its ID and a list of intermediaries.

*__note__*: Installs virtual app instances i.e. routed through at least one intermediary channel. For non-virtual app instances use [install](provider.md#install).

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| appInstanceId | `AppInstanceID` |  ID of the app instance to be installed, generated with \[\[AppFactory.proposeInstallVirtual\]\]. |
| intermediaries | `Address`[] |  Array of addresses of intermediary peers to route installation through |

**Returns:** `Promise`<[AppInstance](appinstance.md)>
Installed AppInstance

___
<a id="off"></a>

###  off

▸ **off**(eventType: *[EventType](../enums/eventtype.md)*, callback: *`function`*): `void`

*Defined in [provider.ts:239](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L239)*

Unsubscribe from event.

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| eventType | [EventType](../enums/eventtype.md) |  Event type to unsubscribe from. |
| callback | `function` |  Original callback passed to subscribe call. |

**Returns:** `void`

___
<a id="on"></a>

###  on

▸ **on**(eventType: *[EventType](../enums/eventtype.md)*, callback: *`function`*): `void`

*Defined in [provider.ts:219](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L219)*

Subscribe to event.

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| eventType | [EventType](../enums/eventtype.md) |  Event type to subscribe to. |
| callback | `function` |  Function to be called when event is fired. |

**Returns:** `void`

___
<a id="once"></a>

###  once

▸ **once**(eventType: *[EventType](../enums/eventtype.md)*, callback: *`function`*): `void`

*Defined in [provider.ts:229](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L229)*

Subscribe to event. Unsubscribe once event is fired once.

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| eventType | [EventType](../enums/eventtype.md) |  Event type to subscribe to. |
| callback | `function` |  Function to be called when event is fired. |

**Returns:** `void`

___
<a id="rejectinstall"></a>

###  rejectInstall

▸ **rejectInstall**(appInstanceId: *`AppInstanceID`*): `Promise`<`void`>

*Defined in [provider.ts:95](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L95)*

Reject installation of a proposed app instance

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| appInstanceId | `AppInstanceID` |  ID of the app instance to reject |

**Returns:** `Promise`<`void`>

___
<a id="withdraw"></a>

###  withdraw

▸ **withdraw**(multisigAddress: *`Address`*, amount: *`BigNumber`*, recipient: *`Address`*): `Promise`<`void`>

*Defined in [provider.ts:168](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/provider.ts#L168)*

Withdraws the specified amount of funds into the channel with the specified multisig address.

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| multisigAddress | `Address` |  Address of the state channel multisig |
| amount | `BigNumber` |  BigNumber representing the deposit's value |
| recipient | `Address` |  Address of the party that should receive the withdrawn funds |

**Returns:** `Promise`<`void`>

___

