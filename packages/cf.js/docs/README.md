
[@counterfactual/cf.js](https://github.com/counterfactual/monorepo/tree/master/packages/cf.js) ![](../../logo.svg)
==================================================================================================================

CF.js is a library that enables web applications to communicate with a user's Counterfactual-enabled wallet. It allows developers to install and interact with apps on the Counterfactual network.

*   Minimal Interface — CF.js exposes a simple set of classes and methods to get the job done easily and quickly, while still allowing for complex behavior.
*   Secure — CF.js never handles a user's money directly: any request to move money into or out of an app is handled by the user's wallet software and has to be manually approved by the user. That means you don't have to worry about mishandling a user's funds.
*   Powerful — Write complex applications that handle real assets on the Ethereum blockchain with the performance of the web stack.

### **Note: The API for CF.js is still highly experimental and is subject to change until a 1.0.0 version is available. This is an active work in progress and the docs will be made available soon.**

Experimental Usage
------------------

**Make sure you have Yarn v1.10.1 installed or higher**. Refer to [Yarn's installation guide](https://yarnpkg.com/lang/en/docs/install/) for setup instructions for your operating system.

To install the dependencies:

```shell
yarn
```

### Building the package

To build the cf.js package:

```shell
yarn build
```

API Reference
-------------

[Found here](docs/)

## Index

### Enumerations

* [AppInstanceEventType](enums/appinstanceeventtype.md)
* [EventType](enums/eventtype.md)

### Classes

* [AppFactory](classes/appfactory.md)
* [AppInstance](classes/appinstance.md)
* [Provider](classes/provider.md)

### Type aliases

* [AppEventData](#appeventdata)
* [CounterfactualEvent](#counterfactualevent)
* [CreateMultisigEventData](#createmultisigeventdata)
* [ErrorEventData](#erroreventdata)
* [EventData](#eventdata)
* [InstallEventData](#installeventdata)
* [RejectInstallEventData](#rejectinstalleventdata)
* [UninstallEventData](#uninstalleventdata)
* [UpdateStateEventData](#updatestateeventdata)

### Variables

* [NODE_REQUEST_TIMEOUT](#node_request_timeout)

### Functions

* [decode](#decode)
* [encode](#encode)
* [encodePacked](#encodepacked)
* [signaturesToBytes](#signaturestobytes)
* [signaturesToBytesSortedBySignerAddress](#signaturestobytessortedbysigneraddress)
* [sortSignaturesBySignerAddress](#sortsignaturesbysigneraddress)

### Object literals

* [cf](#cf)

---

## Type aliases

<a id="appeventdata"></a>

###  AppEventData

**Ƭ AppEventData**: *`object`*

*Defined in [types/events.ts:15](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/types/events.ts#L15)*

#### Type declaration

 appInstance: [AppInstance](classes/appinstance.md)

___
<a id="counterfactualevent"></a>

###  CounterfactualEvent

**Ƭ CounterfactualEvent**: *`object`*

*Defined in [types/events.ts:50](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/types/events.ts#L50)*

#### Type declaration

 data: [EventData](#eventdata)

 type: [EventType](enums/eventtype.md)

___
<a id="createmultisigeventdata"></a>

###  CreateMultisigEventData

**Ƭ CreateMultisigEventData**: *`object`*

*Defined in [types/events.ts:30](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/types/events.ts#L30)*

#### Type declaration

 multisigAddress: `Address`

 owners: `Address`[]

___
<a id="erroreventdata"></a>

###  ErrorEventData

**Ƭ ErrorEventData**: *`object`*

*Defined in [types/events.ts:35](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/types/events.ts#L35)*

#### Type declaration

`Optional`  appInstanceId: `undefined` \| `string`

 errorName: `string`

`Optional`  extra: `undefined` \| `object`

`Optional`  message: `undefined` \| `string`

___
<a id="eventdata"></a>

###  EventData

**Ƭ EventData**: *[InstallEventData](#installeventdata) \| [RejectInstallEventData](#rejectinstalleventdata) \| [UninstallEventData](#uninstalleventdata) \| [UpdateStateEventData](#updatestateeventdata) \| [ErrorEventData](#erroreventdata) \| [CreateMultisigEventData](#createmultisigeventdata)*

*Defined in [types/events.ts:42](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/types/events.ts#L42)*

___
<a id="installeventdata"></a>

###  InstallEventData

**Ƭ InstallEventData**: *[AppEventData](#appeventdata)*

*Defined in [types/events.ts:19](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/types/events.ts#L19)*

___
<a id="rejectinstalleventdata"></a>

###  RejectInstallEventData

**Ƭ RejectInstallEventData**: *[AppEventData](#appeventdata)*

*Defined in [types/events.ts:21](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/types/events.ts#L21)*

___
<a id="uninstalleventdata"></a>

###  UninstallEventData

**Ƭ UninstallEventData**: *[AppEventData](#appeventdata)*

*Defined in [types/events.ts:23](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/types/events.ts#L23)*

___
<a id="updatestateeventdata"></a>

###  UpdateStateEventData

**Ƭ UpdateStateEventData**: *[AppEventData](#appeventdata) & `object`*

*Defined in [types/events.ts:25](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/types/events.ts#L25)*

___

## Variables

<a id="node_request_timeout"></a>

### `<Const>` NODE_REQUEST_TIMEOUT

**● NODE_REQUEST_TIMEOUT**: *`20000`* = 20000

*Defined in [provider.ts:22](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/provider.ts#L22)*

Milliseconds until a method request to the Node is considered timed out.

___

## Functions

<a id="decode"></a>

###  decode

▸ **decode**(types: *`string`[]*, data: *`Arrayish`*): `any`

*Defined in [utils/abi.ts:7](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/utils/abi.ts#L7)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| types | `string`[] |
| data | `Arrayish` |

**Returns:** `any`

___
<a id="encode"></a>

###  encode

▸ **encode**(types: *`string`[]*, values: *`any`[]*): `string`

*Defined in [utils/abi.ts:3](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/utils/abi.ts#L3)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| types | `string`[] |
| values | `any`[] |

**Returns:** `string`

___
<a id="encodepacked"></a>

###  encodePacked

▸ **encodePacked**(types: *`string`[]*, values: *`any`[]*): `string`

*Defined in [utils/abi.ts:11](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/utils/abi.ts#L11)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| types | `string`[] |
| values | `any`[] |

**Returns:** `string`

___
<a id="signaturestobytes"></a>

###  signaturesToBytes

▸ **signaturesToBytes**(...signatures: *`Signature`[]*): `string`

*Defined in [utils/signature.ts:9](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/utils/signature.ts#L9)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| `Rest` signatures | `Signature`[] |

**Returns:** `string`

___
<a id="signaturestobytessortedbysigneraddress"></a>

###  signaturesToBytesSortedBySignerAddress

▸ **signaturesToBytesSortedBySignerAddress**(digest: *`Bytes32`*, ...signatures: *`Signature`[]*): `string`

*Defined in [utils/signature.ts:29](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/utils/signature.ts#L29)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| digest | `Bytes32` |
| `Rest` signatures | `Signature`[] |

**Returns:** `string`

___
<a id="sortsignaturesbysigneraddress"></a>

###  sortSignaturesBySignerAddress

▸ **sortSignaturesBySignerAddress**(digest: *`string`*, signatures: *`Signature`[]*): `Signature`[]

*Defined in [utils/signature.ts:16](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/utils/signature.ts#L16)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| digest | `string` |
| signatures | `Signature`[] |

**Returns:** `Signature`[]

___

## Object literals

<a id="cf"></a>

### `<Const>` cf

**cf**: *`object`*

*Defined in [index.ts:8](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/index.ts#L8)*

<a id="cf.appfactory"></a>

####  AppFactory

**● AppFactory**: *[AppFactory](classes/appfactory.md)*

*Defined in [index.ts:9](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/index.ts#L9)*

___
<a id="cf.provider"></a>

####  Provider

**● Provider**: *[Provider](classes/provider.md)*

*Defined in [index.ts:10](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/index.ts#L10)*

___
<a id="cf.types"></a>

####  types

**● types**: *`"/home/patience/code/work/monorepo/packages/cf.js/src/types/index"`*

*Defined in [index.ts:11](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/index.ts#L11)*

___
<a id="cf.utils"></a>

####  utils

**● utils**: *`"/home/patience/code/work/monorepo/packages/cf.js/src/utils/index"`*

*Defined in [index.ts:12](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/index.ts#L12)*

___

___

