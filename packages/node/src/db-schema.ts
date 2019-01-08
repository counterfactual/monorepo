/**
 * Namespace under which the channels are stored.
 */
export const DB_NAMESPACE_CHANNEL = "channel";

/**
 * Namespace providing a convenience lookup table from a set of owners to multisig address.
 */
export const DB_NAMESPACE_OWNERS_HASH_TO_MULTISIG_ADDRESS =
  "ownersHashToMultisigAddress";

/**
 * appInstanceId explanation:
 *
 * When a Node client initiates an `AppInstance` installation proposal, a UUID is
 * generated in the Node to identify this proposed `AppInstance`. To the Node
 * clients, this UUID becomes the ID of the `AppInstance` they proposed to install,
 * hence appInstanceId.
 * This enables the client to immediately get a response from the Node with
 * an ID to use as a handle for the proposed `AppInstance`.
 *
 * When a peer Node receiving this proposal accepts it and installs it, this
 * installation generates the AppInstanceIdentityHash for the app instance as the
 * act of installation updates the state of the channel. The two IDs,
 * appInstanceId and AppInstanceIdentityHash are then globally mapped
 * (i.e. by all participating Nodes) to each other. Any time any clients use the
 * appInstanceId to refer to the `AppInstance`, the Node does a look up
 * for the AppInstanceIdentityHash to get/set any state for that `AppInstance` inside
 * the relevant channel.
 *

/**
 * Namespace providing a convenience lookup table from appInstanceId to multisig address.
 */
export const DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS =
  "appInstanceIDToMultisigAddress";

/**
 * Namespace providing a lookup table from appInstanceId to AppInstanceIdentityHash.
 */
export const DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_IDENTITY_HASH =
  "appInstanceIDToAppInstanceIdentityHash";

/**
 * Namespace providing a lookup table from AppInstanceIdentityHash to appInstanceId.
 */
export const DB_NAMESPACE_APP_INSTANCE_IDENTITY_HASH_TO_APP_INSTANCE_ID =
  "appInstanceIdentityHashToAppInstanceID";

/**
 * Namespace providing a lookup table from a appInstanceId to the AppInstance
 * that was proposed to be installed.
 */
export const DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE =
  "appInstanceIdToProposedAppInstance";

/**
 * Namespace providing a lookup table from a appInstanceId to the AppInstanceInfo
 * that was installed.
 */
export const DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO =
  "appInstanceIdToAppInstanceInfo";

// TODO: description
export const DB_NAMESPACE_APP_IDENTITY_HASH_TO_COMMITMENT =
  "appInstanceHashToCommitment";

/**
 * Used in standardizing how to set/get app instances within a channel according
 * to their correct status.
 */
export enum APP_INSTANCE_STATUS {
  INSTALLED = "installed",
  PROPOSED = "proposed"
}
