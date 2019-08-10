this.window = this.window || {};
this.window.types = (function (exports) {
  'use strict';

  const multiAssetMultiPartyCoinTransferInterpreterParamsEncoding = `
  tuple(
    uint256[] limit,
    address[] tokenAddresses
  )
`;
  const singleAssetTwoPartyCoinTransferInterpreterParamsEncoding = `
  tuple(uint256 limit, address tokenAddress)
`;
  const twoPartyFixedOutcomeInterpreterParamsEncoding = `
  tuple(address[2] playerAddrs, uint256 amount)
`;
  const virtualAppAgreementEncoding = `
  tuple(
    uint256 capitalProvided,
    address capitalProvider,
    address virtualAppUser,
    address tokenAddress,
  )
`;
  const multiAssetMultiPartyCoinTransferEncoding = `
    tuple(
      address to,
      uint256 amount
    )[][]
`;
  (function (OutcomeType) {
      OutcomeType[OutcomeType["TWO_PARTY_FIXED_OUTCOME"] = 0] = "TWO_PARTY_FIXED_OUTCOME";
      OutcomeType[OutcomeType["MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER"] = 1] = "MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER";
      OutcomeType[OutcomeType["SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER"] = 2] = "SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER";
  })(exports.OutcomeType || (exports.OutcomeType = {}));
  (function (TwoPartyFixedOutcome) {
      TwoPartyFixedOutcome[TwoPartyFixedOutcome["SEND_TO_ADDR_ONE"] = 0] = "SEND_TO_ADDR_ONE";
      TwoPartyFixedOutcome[TwoPartyFixedOutcome["SEND_TO_ADDR_TWO"] = 1] = "SEND_TO_ADDR_TWO";
      TwoPartyFixedOutcome[TwoPartyFixedOutcome["SPLIT_AND_SEND_TO_BOTH_ADDRS"] = 2] = "SPLIT_AND_SEND_TO_BOTH_ADDRS";
  })(exports.TwoPartyFixedOutcome || (exports.TwoPartyFixedOutcome = {}));
  const coinBalanceRefundStateEncoding = `
  tuple(
    address recipient,
    address multisig,
    uint256 threshold,
    address tokenAddress
  )
`;

  (function (Node) {
      let ErrorType;
      (function (ErrorType) {
          ErrorType["ERROR"] = "error";
      })(ErrorType = Node.ErrorType || (Node.ErrorType = {}));
      let MethodName;
      (function (MethodName) {
          MethodName["ACCEPT_STATE"] = "acceptState";
          MethodName["CREATE_CHANNEL"] = "createChannel";
          MethodName["DEPOSIT"] = "deposit";
          MethodName["GET_APP_INSTANCE_DETAILS"] = "getAppInstanceDetails";
          MethodName["GET_APP_INSTANCES"] = "getAppInstances";
          MethodName["GET_CHANNEL_ADDRESSES"] = "getChannelAddresses";
          MethodName["GET_STATE_DEPOSIT_HOLDER_ADDRESS"] = "getStateDepositHolderAddress";
          MethodName["GET_FREE_BALANCE_STATE"] = "getFreeBalanceState";
          MethodName["GET_TOKEN_INDEXED_FREE_BALANCE_STATES"] = "getTokenIndexedFreeBalanceStates";
          MethodName["GET_PROPOSED_APP_INSTANCE"] = "getProposedAppInstance";
          MethodName["GET_PROPOSED_APP_INSTANCES"] = "getProposedAppInstances";
          MethodName["GET_STATE"] = "getState";
          MethodName["GET_STATE_CHANNEL"] = "getStateChannel";
          MethodName["INSTALL"] = "install";
          MethodName["INSTALL_VIRTUAL"] = "installVirtual";
          MethodName["PROPOSE_INSTALL"] = "proposeInstall";
          MethodName["PROPOSE_INSTALL_VIRTUAL"] = "proposeInstallVirtual";
          MethodName["PROPOSE_STATE"] = "proposeState";
          MethodName["REJECT_INSTALL"] = "rejectInstall";
          MethodName["REJECT_STATE"] = "rejectState";
          MethodName["UPDATE_STATE"] = "updateState";
          MethodName["TAKE_ACTION"] = "takeAction";
          MethodName["UNINSTALL"] = "uninstall";
          MethodName["UNINSTALL_VIRTUAL"] = "uninstallVirtual";
          MethodName["WITHDRAW"] = "withdraw";
      })(MethodName = Node.MethodName || (Node.MethodName = {}));
      let RpcMethodName;
      (function (RpcMethodName) {
          RpcMethodName["CREATE_CHANNEL"] = "chan_create";
          RpcMethodName["DEPOSIT"] = "chan_deposit";
          RpcMethodName["GET_APP_INSTANCE_DETAILS"] = "chan_getAppInstance";
          RpcMethodName["GET_APP_INSTANCES"] = "chan_getAppInstances";
          RpcMethodName["GET_STATE_DEPOSIT_HOLDER_ADDRESS"] = "chan_getStateDepositHolderAddress";
          RpcMethodName["GET_FREE_BALANCE_STATE"] = "chan_getFreeBalanceState";
          RpcMethodName["GET_TOKEN_INDEXED_FREE_BALANCE_STATES"] = "chan_getTokenIndexedFreeBalanceStates";
          RpcMethodName["GET_PROPOSED_APP_INSTANCES"] = "chan_getProposedAppInstances";
          RpcMethodName["GET_STATE"] = "chan_getState";
          RpcMethodName["INSTALL"] = "chan_install";
          RpcMethodName["INSTALL_VIRTUAL"] = "chan_installVirtual";
          RpcMethodName["PROPOSE_INSTALL"] = "chan_proposeInstall";
          RpcMethodName["PROPOSE_INSTALL_VIRTUAL"] = "chan_proposeInstallVirtual";
          RpcMethodName["PROPOSE_STATE"] = "chan_proposeState";
          RpcMethodName["REJECT_INSTALL"] = "chan_rejectInstall";
          RpcMethodName["REJECT_STATE"] = "chan_rejectState";
          RpcMethodName["UPDATE_STATE"] = "chan_updateState";
          RpcMethodName["TAKE_ACTION"] = "chan_takeAction";
          RpcMethodName["UNINSTALL"] = "chan_uninstall";
          RpcMethodName["UNINSTALL_VIRTUAL"] = "chan_uninstallVirtual";
          RpcMethodName["WITHDRAW"] = "chan_withdraw";
      })(RpcMethodName = Node.RpcMethodName || (Node.RpcMethodName = {}));
      let EventName;
      (function (EventName) {
          EventName["COUNTER_DEPOSIT_CONFIRMED"] = "counterDepositConfirmed";
          EventName["CREATE_CHANNEL"] = "createChannelEvent";
          EventName["DEPOSIT_CONFIRMED"] = "depositConfirmedEvent";
          EventName["DEPOSIT_FAILED"] = "depositFailed";
          EventName["DEPOSIT_STARTED"] = "depositStartedEvent";
          EventName["INSTALL"] = "installEvent";
          EventName["INSTALL_VIRTUAL"] = "installVirtualEvent";
          EventName["PROPOSE_STATE"] = "proposeStateEvent";
          EventName["REJECT_INSTALL"] = "rejectInstallEvent";
          EventName["REJECT_STATE"] = "rejectStateEvent";
          EventName["UNINSTALL"] = "uninstallEvent";
          EventName["UNINSTALL_VIRTUAL"] = "uninstallVirtualEvent";
          EventName["UPDATE_STATE"] = "updateStateEvent";
          EventName["WITHDRAWAL_CONFIRMED"] = "withdrawalConfirmedEvent";
          EventName["WITHDRAWAL_FAILED"] = "withdrawalFailed";
          EventName["WITHDRAWAL_STARTED"] = "withdrawalStartedEvent";
          EventName["PROPOSE_INSTALL"] = "proposeInstallEvent";
          EventName["PROPOSE_INSTALL_VIRTUAL"] = "proposeInstallVirtualEvent";
          EventName["PROTOCOL_MESSAGE_EVENT"] = "protocolMessageEvent";
          EventName["WITHDRAW_EVENT"] = "withdrawEvent";
          EventName["REJECT_INSTALL_VIRTUAL"] = "rejectInstallVirtualEvent";
      })(EventName = Node.EventName || (Node.EventName = {}));
  })(exports.Node || (exports.Node = {}));

  const EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT = [
      "ChallengeRegistry",
      "ConditionalTransactionDelegateTarget",
      "CoinBalanceRefundApp",
      "MultiAssetMultiPartyCoinTransferInterpreter",
      "IdentityApp",
      "MinimumViableMultisig",
      "ProxyFactory",
      "SingleAssetTwoPartyCoinTransferInterpreter",
      "TimeLockedPassThrough",
      "TwoPartyFixedOutcomeInterpreter",
      "TwoPartyFixedOutcomeFromVirtualAppInterpreter"
  ];

  exports.EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT = EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT;
  exports.coinBalanceRefundStateEncoding = coinBalanceRefundStateEncoding;
  exports.multiAssetMultiPartyCoinTransferEncoding = multiAssetMultiPartyCoinTransferEncoding;
  exports.multiAssetMultiPartyCoinTransferInterpreterParamsEncoding = multiAssetMultiPartyCoinTransferInterpreterParamsEncoding;
  exports.singleAssetTwoPartyCoinTransferInterpreterParamsEncoding = singleAssetTwoPartyCoinTransferInterpreterParamsEncoding;
  exports.twoPartyFixedOutcomeInterpreterParamsEncoding = twoPartyFixedOutcomeInterpreterParamsEncoding;
  exports.virtualAppAgreementEncoding = virtualAppAgreementEncoding;

  return exports;

}({}));
