[@counterfactual/cf.js](../README.md) > [AppInstance](../classes/appinstance.md)

# Class: AppInstance

Represents an installed app instance

## Hierarchy

**AppInstance**

## Index

### Constructors

* [constructor](appinstance.md#constructor)

### Properties

* [abiEncodings](appinstance.md#abiencodings)
* [appDefinition](appinstance.md#appdefinition)
* [ethTransferInterpreterParams](appinstance.md#ethtransferinterpreterparams)
* [eventEmitter](appinstance.md#eventemitter)
* [id](appinstance.md#id)
* [intermediaries](appinstance.md#intermediaries)
* [myDeposit](appinstance.md#mydeposit)
* [peerDeposit](appinstance.md#peerdeposit)
* [provider](appinstance.md#provider)
* [timeout](appinstance.md#timeout)
* [twoPartyOutcomeInterpreterParams](appinstance.md#twopartyoutcomeinterpreterparams)
* [validEventTypes](appinstance.md#valideventtypes)

### Accessors

* [isVirtual](appinstance.md#isvirtual)

### Methods

* [getState](appinstance.md#getstate)
* [off](appinstance.md#off)
* [on](appinstance.md#on)
* [once](appinstance.md#once)
* [takeAction](appinstance.md#takeaction)
* [uninstall](appinstance.md#uninstall)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new AppInstance**(info: *`AppInstanceInfo`*, provider: *[Provider](provider.md)*): [AppInstance](appinstance.md)

*Defined in [app-instance.ts:53](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L53)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| info | `AppInstanceInfo` |
| provider | [Provider](provider.md) |

**Returns:** [AppInstance](appinstance.md)

___

## Properties

<a id="abiencodings"></a>

###  abiEncodings

**● abiEncodings**: *`AppABIEncodings`*

*Defined in [app-instance.ts:36](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L36)*

___
<a id="appdefinition"></a>

###  appDefinition

**● appDefinition**: *`Address`*

*Defined in [app-instance.ts:35](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L35)*

___
<a id="ethtransferinterpreterparams"></a>

### `<Optional>` ethTransferInterpreterParams

**● ethTransferInterpreterParams**: *`ETHTransferInterpreterParams`*

*Defined in [app-instance.ts:48](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L48)*

___
<a id="eventemitter"></a>

### `<Private>` eventEmitter

**● eventEmitter**: *`EventEmitter`* =  new EventEmitter()

*Defined in [app-instance.ts:50](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L50)*

___
<a id="id"></a>

###  id

**● id**: *`AppInstanceID`*

*Defined in [app-instance.ts:32](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L32)*

Unique ID of this app instance.

___
<a id="intermediaries"></a>

### `<Optional>` intermediaries

**● intermediaries**: *`Address`[]*

*Defined in [app-instance.ts:42](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L42)*

___
<a id="mydeposit"></a>

###  myDeposit

**● myDeposit**: *`BigNumber`*

*Defined in [app-instance.ts:40](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L40)*

___
<a id="peerdeposit"></a>

###  peerDeposit

**● peerDeposit**: *`BigNumber`*

*Defined in [app-instance.ts:41](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L41)*

___
<a id="provider"></a>

###  provider

**● provider**: *[Provider](provider.md)*

*Defined in [app-instance.ts:55](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L55)*

___
<a id="timeout"></a>

###  timeout

**● timeout**: *`BigNumber`*

*Defined in [app-instance.ts:37](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L37)*

___
<a id="twopartyoutcomeinterpreterparams"></a>

### `<Optional>` twoPartyOutcomeInterpreterParams

**● twoPartyOutcomeInterpreterParams**: *`TwoPartyOutcomeInterpreterParams`*

*Defined in [app-instance.ts:47](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L47)*

Interpreter-related Fields

___
<a id="valideventtypes"></a>

### `<Private>` validEventTypes

**● validEventTypes**: *`any`[]* =  Object.keys(AppInstanceEventType).map(
    key => AppInstanceEventType[key]
  )

*Defined in [app-instance.ts:51](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L51)*

___

## Accessors

<a id="isvirtual"></a>

###  isVirtual

**get isVirtual**(): `boolean`

*Defined in [app-instance.ts:71](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L71)*

Whether this app is virtual i.e. installation was routed through intermediaries

**Returns:** `boolean`

___

## Methods

<a id="getstate"></a>

###  getState

▸ **getState**(): `Promise`<`SolidityABIEncoderV2Type`>

*Defined in [app-instance.ts:81](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L81)*

Get latest state of this app instance

*__async__*: 

**Returns:** `Promise`<`SolidityABIEncoderV2Type`>
JSON representation of latest state

___
<a id="off"></a>

###  off

▸ **off**(eventType: *[AppInstanceEventType](../enums/appinstanceeventtype.md)*, callback: *`function`*): `void`

*Defined in [app-instance.ts:171](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L171)*

Unsubscribe from event.

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| eventType | [AppInstanceEventType](../enums/appinstanceeventtype.md) |  Event type to unsubscribe from. |
| callback | `function` |  Original callback passed to subscribe call. |

**Returns:** `void`

___
<a id="on"></a>

###  on

▸ **on**(eventType: *[AppInstanceEventType](../enums/appinstanceeventtype.md)*, callback: *`function`*): `void`

*Defined in [app-instance.ts:143](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L143)*

Subscribe to event.

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| eventType | [AppInstanceEventType](../enums/appinstanceeventtype.md) |  Event type to subscribe to. |
| callback | `function` |  Function to be called when event is fired. |

**Returns:** `void`

___
<a id="once"></a>

###  once

▸ **once**(eventType: *[AppInstanceEventType](../enums/appinstanceeventtype.md)*, callback: *`function`*): `void`

*Defined in [app-instance.ts:157](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L157)*

Subscribe to event. Unsubscribe once event is fired once.

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| eventType | [AppInstanceEventType](../enums/appinstanceeventtype.md) |  Event type to subscribe to. |
| callback | `function` |  Function to be called when event is fired. |

**Returns:** `void`

___
<a id="takeaction"></a>

###  takeAction

▸ **takeAction**(action: *`SolidityABIEncoderV2Type`*): `Promise`<`SolidityABIEncoderV2Type`>

*Defined in [app-instance.ts:101](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L101)*

Take an action on the state, modifying it.

*__note__*: Throws an error if action is illegal given the latest state.

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| action | `SolidityABIEncoderV2Type` |  Action to take |

**Returns:** `Promise`<`SolidityABIEncoderV2Type`>
JSON representation of latest state after applying the action

___
<a id="uninstall"></a>

###  uninstall

▸ **uninstall**(): `Promise`<`void`>

*Defined in [app-instance.ts:121](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-instance.ts#L121)*

Uninstall this app instance

*__async__*: 

**Returns:** `Promise`<`void`>

___

