export default {
  // SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods
  MethodName: {
    GET_APP_INSTANCES: "getAppInstances",
    GET_PROPOSED_APP_INSTANCES: "getProposedAppInstances",
    PROPOSE_INSTALL: "proposeInstall",
    PROPOSE_INSTALL_VIRTUAL: "proposeInstallVirtual",
    REJECT_INSTALL: "rejectInstall",
    INSTALL: "install",
    INSTALL_VIRTUAL: "installVirtual",
    GET_STATE: "getState",
    GET_APP_INSTANCE_DETAILS: "getAppInstanceDetails",
    TAKE_ACTION: "takeAction",
    UNINSTALL: "uninstall",
    PROPOSE_STATE: "proposeState",
    ACCEPT_STATE: "acceptState",
    REJECT_STATE: "rejectState",
    CREATE_MULTISIG: "createMultisig",
    GET_CHANNEL_ADDRESSES: "getChannelAddresses",
    MATCHMAKE: "matchmake"
  },
  // SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
  EventName: {
    INSTALL: "installEvent",
    REJECT_INSTALL: "rejectInstallEvent",
    UPDATE_STATE: "updateStateEvent",
    UNINSTALL: "uninstallEvent",
    PROPOSE_STATE: "proposeStateEvent",
    REJECT_STATE: "rejectStateEvent",
    CREATE_MULTISIG: "createMultisigEvent"
  }
}