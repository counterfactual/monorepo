export const ERRORS = {
  NO_APP_INSTANCE_FOR_APP_INSTANCE_ID:
    "No AppInstance exists for the specified AppInstanceId",
  NO_APP_INSTANCE_ID_FOR_GET_STATE:
    "No AppInstanceID specified to get state for",
  NO_APP_INSTANCE_ID_TO_INSTALL: "No AppInstanceId specified to install",
  NO_MULTISIG_FOR_APP_INSTANCE_ID:
    "No multisig address exists for the given appInstanceId",
  NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID:
    "No proposed AppInstance exists for the given appInstanceId",
  NO_ACTION_SPECIFIED_TO_TAKE: "No action was specified to take",
  NO_APP_INSTANCE_ID_FOR_INCOMING_STATE_UPDATE:
    "No AppInstanceId was specified for an incoming AppInstance state update",
  NO_UPDATED_STATE_SUPPLIED:
    "No updated state was supplied for an AppInstance state update",
  INVALID_UPDATED_STATE_SUPPLIED:
    "The supplied updated state does not match the locally computed state update",
  APP_CONTRACT_CREATION_FAILED:
    "Failed to create a contract instance for the App",
  UNSPECIFIED_CONTRACT_ADDRESS:
    "The address of the contract for the AppInstance is not specified",
  UNSPECIFIED_STATE_ENCODING:
    "The state encoding of the contract for the AppInstance is not specified"
};
