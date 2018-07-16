# Module Layer

In the Counterfactual stack, the Module layer is the highest layer that talks to Applications and it's above the Channel layer, which is responsible for handling state-channel-specific protocols specifically revolving around the other parties of the channel.

*TODO: The explanation for having this `StateChannel` struct is probably better in the context of the entire State Channel Client and not specifically within the Module Layer, but while a State Channel Client description doesn't exist, this will suffice.*

Every time there's a request to create a state channel, the State Channel Client creates a`StateChannel` struct, which is defined as such:
```
struct StateChannel {
	address: string,
	vectorNonce: Vector<Nonce>,
	branches: Map<string, Module>
}
**Note**:  the `branches` property of the `StateChannel` struct also holds references to Free Balance Modules of different asset classes. 
```

Hence, the State Channel Client can hold a set of `StateChannel`s and facilitate activity on them, whether that's creating one or installing new modules onto it.

There are two different types of modules:
- Application Module: the modules that define some specific functionality that can be used by applications
- System Module: the primitive modules that facilitate the functionality between the Application Modules and the Channel Layer

**Note**: For each method in any module, the invocation is assumed to be in the context of the State Channel Client controller.

## Application Module
The Application Module should adhere to an interface like the following:

```
**/
* Installs an instance of the module into a channel by forwarding the install request
* to the channel layer.
* TODO: wouldn't it be simpler if this request was directly against the Channel API?
* 
* @param parameters: JSON The JSON blob containing app-specific info for installation
* @param channel: &StateChannel A reference to the state chanenl the module is 
*                               being installed onto.
* @param assetClass: string The name of the asset class to use for this application.
* @param amount: number The amount of said asset class to use _from the initiator_.
* @param misc: string Optional string to hold data to send to other user(s).
*
* @returns appUUID: uint Can be used by the State Channel Client to register an event listener
* for when the module is installed, the client can notify the initiating user channel-wide
* installation has completed.
**/
function install(
	parameters: JSON,
	channel: &StateChannel,
	assetClass: string,
	amount: number,
	misc?: string
);
```


## System Module
The system modules are stateless and only expose a functional interface.


There are 4 system modules (as of now):
- Channel Module
- Free Balance Module
- Nonce Module
- Signature Module

### Channel Module
```
/**
* Creates a channel (i.e. multisig) and initiates the funding protocol for all parties.
* @param addresses: Array<string> The addresses to create the channel for.
* @return StateChannel A state channel whose address is that of a multisig deployed on chain.
**/
function funding(addresses: Array<string>);

/**
* TODO: think more thoroughly about how a metachannel would be setup
* @param addresses: Array<string> The addresses to create the channel for.
* @param intermediary: string The address to create metachannel through.
* @return StateChannel A state channel whose address is that of a multisig that may not be deployed on chain yet.
**/
function createMetaChannel(addresses: Array<string>, intermediary: string);

/**
* If a state channel exists for the specified parties, it returns the address of the multisig.
* @param addresses: Array<string> The parties in the channel.
* @param Nullable<string> Returns the address of the multisig with the given parties, if one exists.
**/
function getChannelAddress(addresses: Array<string>);
```

### 

### Free Balance Module
When the State Channel Client receives a request to install an App module into a state channel, the Channel Layer's Install Handler requests a commitment from the Free Balance Module to allocate funds of the specified asset class to the App module being installed.
```
/**
* Creates a commitment to allocate funds from the pool of unallocated asset class to the
* specified application.
* @param channel: &StateChannel A reference to the state channel whose funds are 
*                               being moved around.
* @param appId: string The ID of the application to allocate funds for.
* @param assetClass: string The asset class of the funds to allocate.
* @param amount: number The amount of the specified asset class to allocate _for the local user_.
* @return Commitment The commitment to allocate funds as specified.
**/
function getInstallCommitment(channel: &StateChannel, appId: string, assetClass: string, amount: number);

/**
* TODO: define this function signature
*
**/
function getUninstallCommitment()
```

### Nonce Module
When an activity occurs for the state of the channel to be updated, whether that's an update of an existing application module or an installation of one, the vector nonce of the state channel gets updated. This module provides the interface for such operations.
```
/**
* Updates the nonce for a specified branch of the channel.
* @param vectorNonce: &Vector<Nonce> A reference to the vector holding all the nonces of the channel.
* @param index: uint The index of the nonce within the vector to update.
* @param newNonce: Nonce The nonce to call setState with to update the value of the index.
* @returns Commitment The commitment to update the index of the vector nonce.
**/
function updateNonce(vectorNonce: &Vector<Nonce>, index: uint, newNonce: Nonce);
```

### Signature Module
Any activity taking place in the channel on behalf of any user is a Commitment. In order for the parties of the channel to unanimously agree on some activity, all the parties must sign the commitment for said activity. The signature module facilitates this signing act.
```
/**
* @param commitment: Commitment The commitment to sign.
* @returns commitment: Commitment The commitment which has been signed.
**/
function signCommitment(commitment: Commitment);
```
<!--stackedit_data:
eyJoaXN0b3J5IjpbLTQ2OTExMTQ3NywtMTM3MTQ3ODg1NywtMT
IzNjI2MjUzMCwtMTM3MTQ3ODg1NywtMTIzNjI2MjUzMCwtMTM3
MTQ3ODg1NywtMTIzNjI2MjUzMCwtMTM3MTQ3ODg1NywtMTU4ND
EyMzMyOSwtODYyMDAzMDg2LC0xMDIxNTcxNyw0NTA1MDcwMzcs
MTU4MTE4ODM1MCw0MjMxOTYzMDIsLTI3MTQ3OTA3LDIwMjc1OT
E0NzYsOTU4NjYyMzYyLC0xNDA2MzI4NjEyLC01Nzc0MjQ3NTcs
LTEwNTg2MzM3MzRdfQ==
-->
