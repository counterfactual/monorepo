/**
 * Namespace under which the channels are stored.
 */
export const CHANNEL = "channel";

/**
 * Namespace providing a convenience lookup table from a set of owners to multisig address.
 */
export const OWNERS_HASH_TO_MULTISIG_ADDRESS = "ownersHashToMultisigAddress";

/**
 * clientAppInstanceID explanation:
 *
 * When a Node client initiates an AppInstance installation proposal, a UUID is
 * generated in the Node to identify this proposed app instance. To the Node
 * clients, this UUID becomes the ID of the AppInstance they proposed to install,
 * hence clientAppInstanceID.
 * This enables the client to immediately get a response from the Node with
 * an ID to use as a handle for the proposed AppInstance.
 *
 * When a peer Node receiving this proposal accepts it and installs it, this
 * installation generates the channelAppInstanceID for the app instance as the
 * act of installation updates the state of the channel. The two IDs,
 * clientAppInstanceID and channelAppInstanceID are then globally mapped
 * (i.e. by all participating Nodes) to each other. Any time any clients use the
 * clientAppInstanceID to refer to the AppInstance, the Node does a look up
 * for the channelAppInstanceID to get/set any state for that AppInstance inside
 * the relevant channel.
 *

/**
 * Namespace providing a convenience lookup table from clientAppInstanceID to multisig address.
 */
export const CLIENT_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS =
  "clientAppInstanceIDToMultisigAddress";

/**
 * Namespace providing a lookup table from clientAppInstanceID to channelAppInstanceID.
 */
export const CLIENT_APP_INSTANCE_ID_TO_CHANNEL_APP_INSTANCE_ID =
  "clientAppInstanceIDToChannelAppInstanceId";

/**
 * Namespace providing a lookup table from channelAppInstanceID to clientAppInstanceID.
 */
export const CHANNEL_APP_INSTANCE_ID_TO_CLIENT_APP_INSTANCE_ID =
  "channelAppInstanceIdToClientAppInstanceID";

/**
 * Namespace providing a lookup table from a clientAppInstanceID to the AppInstance
 * that was proposed to be installed.
 */
export const CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE =
  "clientAppInstanceIdToProposedAppInstance";

/**
 * Used in standardizing how to set/get app instances within a channel according
 * to their correct status.
 */
export enum APP_INSTANCE_STATUS {
  INSTALLED = "installed",
  PROPOSED = "proposed"
}
