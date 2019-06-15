[@counterfactual/cf.js](../README.md) > [Provider](../classes/provider.md)

# Class: Provider

Provides convenience methods for interacting with a Counterfactual node

## Hierarchy

**Provider**

## Index

### Constructors

* [constructor](provider.md#constructor)

### Properties

* [nodeProvider](provider.md#nodeprovider)
* [validEventTypes](provider.md#valideventtypes)

### Methods

* [callRawNodeMethod](provider.md#callrawnodemethod)
* [getAppInstances](provider.md#getappinstances)
* [getOrCreateAppInstance](provider.md#getorcreateappinstance)
* [install](provider.md#install)
* [installVirtual](provider.md#installvirtual)
* [off](provider.md#off)
* [on](provider.md#on)
* [once](provider.md#once)
* [rejectInstall](provider.md#rejectinstall)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new Provider**(nodeProvider: *`INodeProvider`*): [Provider](provider.md)

*Defined in [provider.ts:38](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L38)*

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

*Defined in [provider.ts:44](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L44)*

NodeProvider instance that enables communication with the Counterfactual node

___
<a id="valideventtypes"></a>

### `<Private>` validEventTypes

**● validEventTypes**: *`any`[]* =  Object.keys(EventType).map(
    key => EventType[key]
  )

*Defined in [provider.ts:36](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L36)*

___

## Methods

<a id="callrawnodemethod"></a>

###  callRawNodeMethod

▸ **callRawNodeMethod**(methodName: *`MethodName`*, params: *`Node.MethodParams`*): `Promise`<`Node.MethodResponse`>

*Defined in [provider.ts:170](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L170)*

Call a Node method

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| methodName | `MethodName` |  Name of Node method to call |
| params | `Node.MethodParams` |  Method-specific parameter object |

**Returns:** `Promise`<`Node.MethodResponse`>

___
<a id="getappinstances"></a>

###  getAppInstances

▸ **getAppInstances**(): `Promise`<[AppInstance](appinstance.md)[]>

*Defined in [provider.ts:55](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L55)*

Get all currently installed app instances

*__async__*: 

**Returns:** `Promise`<[AppInstance](appinstance.md)[]>
Array of currently installed app instances

___
<a id="getorcreateappinstance"></a>

###  getOrCreateAppInstance

▸ **getOrCreateAppInstance**(id: *`AppInstanceID`*, info?: *`AppInstanceInfo`*): `Promise`<[AppInstance](appinstance.md)>

*Defined in [provider.ts:225](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L225)*

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

*Defined in [provider.ts:80](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L80)*

Install a non-virtual app instance given its ID.

*__note__*: Installs non-virtual app instances i.e. in a direct channel between you and your peer. For virtual app instances use [installVirtual](provider.md#installvirtual).

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| appInstanceId | `AppInstanceID` |  ID of the app instance to be installed, generated using [AppFactory.proposeInstall](appfactory.md#proposeinstall) |

**Returns:** `Promise`<[AppInstance](appinstance.md)>
Installed AppInstance

___
<a id="installvirtual"></a>

###  installVirtual

▸ **installVirtual**(appInstanceId: *`AppInstanceID`*, intermediaries: *`Address`[]*): `Promise`<[AppInstance](appinstance.md)>

*Defined in [provider.ts:101](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L101)*

Install a virtual app instance given its ID and a list of intermediaries.

*__note__*: Installs virtual app instances i.e. routed through at least one intermediary channel. For non-virtual app instances use [install](provider.md#install).

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| appInstanceId | `AppInstanceID` |  ID of the app instance to be installed, generated with [AppFactory.proposeInstallVirtual](appfactory.md#proposeinstallvirtual). |
| intermediaries | `Address`[] |  Array of addresses of intermediary peers to route installation through |

**Returns:** `Promise`<[AppInstance](appinstance.md)>
Installed AppInstance

___
<a id="off"></a>

###  off

▸ **off**(eventType: *[EventType](../enums/eventtype.md)*, callback: *`function`*): `void`

*Defined in [provider.ts:159](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L159)*

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

*Defined in [provider.ts:137](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L137)*

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

*Defined in [provider.ts:148](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L148)*

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

*Defined in [provider.ts:123](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L123)*

Reject installation of a proposed app instance

*__async__*: 

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| appInstanceId | `AppInstanceID` |  ID of the app instance to reject |

**Returns:** `Promise`<`void`>

___

