[@counterfactual/cf-wallet.js](../README.md) > [AppInstance](../classes/appinstance.md)

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
* [id](appinstance.md#id)
* [intermediaries](appinstance.md#intermediaries)
* [myDeposit](appinstance.md#mydeposit)
* [peerDeposit](appinstance.md#peerdeposit)
* [provider](appinstance.md#provider)
* [timeout](appinstance.md#timeout)
* [twoPartyOutcomeInterpreterParams](appinstance.md#twopartyoutcomeinterpreterparams)

### Accessors

* [isVirtual](appinstance.md#isvirtual)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new AppInstance**(info: *`AppInstanceInfo`*, provider: *[Provider](provider.md)*): [AppInstance](appinstance.md)

*Defined in [app-instance.ts:36](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L36)*

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

*Defined in [app-instance.ts:26](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L26)*

___
<a id="appdefinition"></a>

###  appDefinition

**● appDefinition**: *`Address`*

*Defined in [app-instance.ts:25](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L25)*

___
<a id="ethtransferinterpreterparams"></a>

### `<Optional>` ethTransferInterpreterParams

**● ethTransferInterpreterParams**: *`ETHTransferInterpreterParams`*

*Defined in [app-instance.ts:34](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L34)*

___
<a id="id"></a>

###  id

**● id**: *`AppInstanceID`*

*Defined in [app-instance.ts:22](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L22)*

Unique ID of this app instance.

___
<a id="intermediaries"></a>

### `<Optional>` intermediaries

**● intermediaries**: *`Address`[]*

*Defined in [app-instance.ts:36](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L36)*

___
<a id="mydeposit"></a>

###  myDeposit

**● myDeposit**: *`BigNumber`*

*Defined in [app-instance.ts:30](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L30)*

___
<a id="peerdeposit"></a>

###  peerDeposit

**● peerDeposit**: *`BigNumber`*

*Defined in [app-instance.ts:31](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L31)*

___
<a id="provider"></a>

###  provider

**● provider**: *[Provider](provider.md)*

*Defined in [app-instance.ts:38](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L38)*

___
<a id="timeout"></a>

###  timeout

**● timeout**: *`BigNumber`*

*Defined in [app-instance.ts:27](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L27)*

___
<a id="twopartyoutcomeinterpreterparams"></a>

### `<Optional>` twoPartyOutcomeInterpreterParams

**● twoPartyOutcomeInterpreterParams**: *`TwoPartyOutcomeInterpreterParams`*

*Defined in [app-instance.ts:33](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L33)*

___

## Accessors

<a id="isvirtual"></a>

###  isVirtual

**get isVirtual**(): `boolean`

*Defined in [app-instance.ts:54](https://github.com/counterfactual/monorepo/blob/7f293742/packages/cf-wallet.js/src/app-instance.ts#L54)*

Whether this app is virtual i.e. installation was routed through intermediaries

**Returns:** `boolean`

___

