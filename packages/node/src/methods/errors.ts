export const ERRORS = {
  NO_APP_INSTANCE_ID_FOR_GET_STATE:
    "No AppInstanceID specified to get state for",
  NO_APP_INSTANCE_ID_TO_GET_DETAILS:
    "No AppInstanceID specified to get details for",
  NO_APP_INSTANCE_FOR_GIVEN_ID: "No AppInstance exists for the given ID",
  NO_APP_INSTANCE_ID_TO_INSTALL: "No AppInstanceId specified to install",
  NO_APP_INSTANCE_ID_TO_UNINSTALL: "No AppInstanceId specified to uninstall",
  NO_MULTISIG_FOR_APP_INSTANCE_ID:
    "No multisig address exists for the given appInstanceId",
  NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID: id =>
    `No proposed AppInstance exists for the given appInstanceId: ${id}`,
  NULL_INITIAL_STATE_FOR_PROPOSAL:
    "A proposed AppInstance cannot have an empty initial state",
  NO_APP_INSTANCE_FOR_TAKE_ACTION:
    "No AppInstanceId specified to takeAction on",
  NO_APP_CONTRACT_ADDR: "The App Contract address is empty",
  INVALID_ACTION: "Invalid action taken",
  IMPROPERLY_FORMATTED_ACTION: "Improperly formatted action",
  NO_ACTION_ENCODING_FOR_APP_INSTANCE:
    "The AppInstance does not have an Action encoding defined",
  ACTION_OBJECT_NOT_ENCODABLE:
    "The Action object is not encodable by the AppInstance's Action encoding",
  NO_STATE_CHANNEL_FOR_MULTISIG_ADDR: (resp, query) =>
    `Call to getStateChannel failed, response was ${resp} when searching for multisig address: ${query}`,
  CHANNEL_CREATION_FAILED:
    "Failed to create channel. Multisignature wallet cannot be deployed properly",
  INVALID_NETWORK_NAME: "Invalid network name provided for initializing Node"
};
