[@counterfactual/cf.js](../README.md) > [AppFactory](../classes/appfactory.md)

# Class: AppFactory

Proposes installations of a given app

## Hierarchy

**AppFactory**

## Index

### Constructors

* [constructor](appfactory.md#constructor)

### Properties

* [appDefinition](appfactory.md#appdefinition)
* [encodings](appfactory.md#encodings)
* [provider](appfactory.md#provider)

### Methods

* [proposeInstall](appfactory.md#proposeinstall)
* [proposeInstallVirtual](appfactory.md#proposeinstallvirtual)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new AppFactory**(appDefinition: *`Address`*, encodings: *`AppABIEncodings`*, provider: *[Provider](provider.md)*): [AppFactory](appfactory.md)

*Defined in [app-factory.ts:37](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-factory.ts#L37)*

Constructs a new instance

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| appDefinition | `Address` |  Address of the on-chain contract containing the app logic. |
| encodings | `AppABIEncodings` |  ABI encodings to encode and decode the app's state and actions |
| provider | [Provider](provider.md) |  CFjs provider |

**Returns:** [AppFactory](appfactory.md)

___

## Properties

<a id="appdefinition"></a>

###  appDefinition

**● appDefinition**: *`Address`*

*Defined in [app-factory.ts:45](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-factory.ts#L45)*

Address of the on-chain contract containing the app logic.

___
<a id="encodings"></a>

###  encodings

**● encodings**: *`AppABIEncodings`*

*Defined in [app-factory.ts:46](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-factory.ts#L46)*

ABI encodings to encode and decode the app's state and actions

___
<a id="provider"></a>

###  provider

**● provider**: *[Provider](provider.md)*

*Defined in [app-factory.ts:47](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-factory.ts#L47)*

CFjs provider

___

## Methods

<a id="proposeinstall"></a>

###  proposeInstall

▸ **proposeInstall**(params: *`object`*): `Promise`<`AppInstanceID`>

*Defined in [app-factory.ts:57](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-factory.ts#L57)*

Propose installation of a non-virtual app instance i.e. installed in direct channel between you and peer

*__async__*: 

**Parameters:**

**params: `object`**

Proposal parameters

| Name | Type | Description |
| ------ | ------ | ------ |
| initialState | `SolidityABIEncoderV2Type` |  Initial state of app instance |
| myDeposit | `BigNumberish` |  Amount to be deposited by you |
| peerDeposit | `BigNumberish` |  Amount to be deposited by peer |
| proposedToIdentifier | `string` |  Xpub of peer being proposed to install instance with |
| timeout | `BigNumberish` |  Number of blocks until an on-chain submitted state is considered final |

**Returns:** `Promise`<`AppInstanceID`>
ID of proposed app instance

___
<a id="proposeinstallvirtual"></a>

###  proposeInstallVirtual

▸ **proposeInstallVirtual**(params: *`object`*): `Promise`<`AppInstanceID`>

*Defined in [app-factory.ts:96](https://github.com/counterfactual/monorepo/blob/5f3d3162/packages/cf.js/src/app-factory.ts#L96)*

Propose installation of a virtual app instance i.e. routed through at least one intermediary node

*__async__*: 

**Parameters:**

**params: `object`**

Proposal parameters

| Name | Type | Description |
| ------ | ------ | ------ |
| initialState | `SolidityABIEncoderV2Type` |  Initial state of app instance |
| intermediaries | `string`[] |  List of intermediary peers to route installation through |
| myDeposit | `BigNumberish` |  Amount to be deposited by you |
| peerDeposit | `BigNumberish` |  Amount to be deposited by peer |
| proposedToIdentifier | `string` |  xpub of peer being proposed to install instance with |
| timeout | `BigNumberish` |  Number of blocks until an on-chain submitted state is considered final |

**Returns:** `Promise`<`AppInstanceID`>
ID of proposed app instance

___

