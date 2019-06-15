
[@counterfactual/cf-wallet.js](https://github.com/counterfactual/monorepo/tree/master/packages/cf-wallet.js) ![](../../logo.svg)
================================================================================================================================

cf-wallet.js is a library that enables web applications to communicate with a user's Counterfactual-enabled wallet. It allows developers to install and interact with apps on the Counterfactual network.

*   Minimal Interface — cf-wallet.js exposes a simple set of classes and methods to get the job done easily and quickly, while still allowing for complex behavior.
*   Secure — cf-wallet.js never handles a user's money directly: any request to move money into or out of an app is handled by the user's wallet software and has to be manually approved by the user. That means you don't have to worry about mishandling a user's funds.
*   Powerful — Write complex applications that handle real assets on the Ethereum blockchain with the performance of the web stack.

### **Note: The API for cf-wallet.js is still highly experimental and is subject to change until a 1.0.0 version is available. This is an active work in progress and the docs will be made available soon.**

Experimental Usage
------------------

**Make sure you have Yarn v1.10.1 installed or higher**. Refer to [Yarn's installation guide](https://yarnpkg.com/lang/en/docs/install/) for setup instructions for your operating system.

To install the dependencies:

```shell
yarn
```

### Building the package

To build the cf-wallet.js package:

```shell
yarn build 
```

API Reference
-------------

[Found here](docs/)

## Index

### Enumerations

* [EventType](enums/eventtype.md)

### Classes

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

* [cfWallet](#cfwallet)

---

## Type aliases

<a id="appeventdata"></a>

###  AppEventData

**Ƭ AppEventData**: *`object`*

*Defined in [types/events.ts:14](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/types/events.ts#L14)*

#### Type declaration

 appInstance: [AppInstance](classes/appinstance.md)

___
<a id="counterfactualevent"></a>

###  CounterfactualEvent

**Ƭ CounterfactualEvent**: *`object`*

*Defined in [types/events.ts:40](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/types/events.ts#L40)*

#### Type declaration

 data: [EventData](#eventdata)

 type: [EventType](enums/eventtype.md)

___
<a id="createmultisigeventdata"></a>

###  CreateMultisigEventData

**Ƭ CreateMultisigEventData**: *`object`*

*Defined in [types/events.ts:22](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/types/events.ts#L22)*

#### Type declaration

 multisigAddress: `Address`

 owners: `Address`[]

___
<a id="erroreventdata"></a>

###  ErrorEventData

**Ƭ ErrorEventData**: *`object`*

*Defined in [types/events.ts:27](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/types/events.ts#L27)*

#### Type declaration

`Optional`  appInstanceId: `undefined` \| `string`

 errorName: `string`

`Optional`  extra: `undefined` \| `object`

`Optional`  message: `undefined` \| `string`

___
<a id="eventdata"></a>

###  EventData

**Ƭ EventData**: *[InstallEventData](#installeventdata) \| [RejectInstallEventData](#rejectinstalleventdata) \| [ErrorEventData](#erroreventdata) \| [CreateMultisigEventData](#createmultisigeventdata)*

*Defined in [types/events.ts:34](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/types/events.ts#L34)*

___
<a id="installeventdata"></a>

###  InstallEventData

**Ƭ InstallEventData**: *[AppEventData](#appeventdata)*

*Defined in [types/events.ts:18](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/types/events.ts#L18)*

___
<a id="rejectinstalleventdata"></a>

###  RejectInstallEventData

**Ƭ RejectInstallEventData**: *[AppEventData](#appeventdata)*

*Defined in [types/events.ts:20](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/types/events.ts#L20)*

___

## Variables

<a id="node_request_timeout"></a>

### `<Const>` NODE_REQUEST_TIMEOUT

**● NODE_REQUEST_TIMEOUT**: *`20000`* = 20000

*Defined in [provider.ts:17](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/provider.ts#L17)*

Milliseconds until a method request to the Node is considered timed out.

___

## Functions

<a id="decode"></a>

###  decode

▸ **decode**(types: *`string`[]*, data: *`Arrayish`*): `any`

*Defined in [utils/abi.ts:21](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/utils/abi.ts#L21)*

Returns an Object by parsing data assuming types, with each parameter accessible as a positional parameters. Throws if data is invalid for the types.

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| types | `string`[] |  Data types |
| data | `Arrayish` |

**Returns:** `any`

___
<a id="encode"></a>

###  encode

▸ **encode**(types: *`string`[]*, values: *`any`[]*): `string`

*Defined in [utils/abi.ts:10](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/utils/abi.ts#L10)*

Returns a hex string of the values encoded as the types. Throws if a value is invalid for the type.

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| types | `string`[] |  Data types |
| values | `any`[] |  Values to encode |

**Returns:** `string`

___
<a id="encodepacked"></a>

###  encodePacked

▸ **encodePacked**(types: *`string`[]*, values: *`any`[]*): `string`

*Defined in [utils/abi.ts:31](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/utils/abi.ts#L31)*

Compute the Solidity non-standard (tightly) packed data for values given the types.

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| types | `string`[] |  Data types |
| values | `any`[] |  Values to pack |

**Returns:** `string`

___
<a id="signaturestobytes"></a>

###  signaturesToBytes

▸ **signaturesToBytes**(...signatures: *`Signature`[]*): `string`

*Defined in [utils/signature.ts:14](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/utils/signature.ts#L14)*

Converts an array of signatures into a single string

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| `Rest` signatures | `Signature`[] |  An array of etherium signatures |

**Returns:** `string`

___
<a id="signaturestobytessortedbysigneraddress"></a>

###  signaturesToBytesSortedBySignerAddress

▸ **signaturesToBytesSortedBySignerAddress**(digest: *`Bytes32`*, ...signatures: *`Signature`[]*): `string`

*Defined in [utils/signature.ts:45](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/utils/signature.ts#L45)*

Sorts signatures in ascending order of signer address and converts them into bytes

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| digest | `Bytes32` |
| `Rest` signatures | `Signature`[] |  An array of etherium signatures |

**Returns:** `string`

___
<a id="sortsignaturesbysigneraddress"></a>

###  sortSignaturesBySignerAddress

▸ **sortSignaturesBySignerAddress**(digest: *`string`*, signatures: *`Signature`[]*): `Signature`[]

*Defined in [utils/signature.ts:26](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/utils/signature.ts#L26)*

Sorts signatures in ascending order of signer address

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| digest | `string` |
| signatures | `Signature`[] |  An array of etherium signatures |

**Returns:** `Signature`[]

___

## Object literals

<a id="cfwallet"></a>

### `<Const>` cfWallet

**cfWallet**: *`object`*

*Defined in [index.ts:7](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/index.ts#L7)*

<a id="cfwallet.provider"></a>

####  Provider

**● Provider**: *[Provider](classes/provider.md)*

*Defined in [index.ts:8](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/index.ts#L8)*

___
<a id="cfwallet.types"></a>

####  types

**● types**: *`"/home/patience/code/work/monorepo/packages/cf-wallet.js/src/types/index"`*

*Defined in [index.ts:9](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/index.ts#L9)*

___
<a id="cfwallet.utils"></a>

####  utils

**● utils**: *`"/home/patience/code/work/monorepo/packages/cf-wallet.js/src/utils/index"`*

*Defined in [index.ts:10](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf-wallet.js/src/index.ts#L10)*

___

___

