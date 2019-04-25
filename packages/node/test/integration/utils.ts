import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  AppInstanceInfo,
  AssetType,
  BlockchainAsset,
  ETHBucketAppState,
  NetworkContext,
  networkContextProps,
  Node as NodeTypes,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { AddressZero, One, Zero } from "ethers/constants";
import { BigNumber } from "ethers/utils";
import { v4 as generateUUID } from "uuid";

import { Node } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";

/**
 * Even though this function returns a transaction hash, the calling Node
 * will receive an event (CREATE_CHANNEL) that should be subscribed to to
 * ensure a channel has been instantiated and to get its multisig address
 * back in the event data.
 */
export async function getMultisigCreationTransactionHash(
  node: Node,
  xpubs: string[]
): Promise<Address> {
  const req: NodeTypes.MethodRequest = {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.CREATE_CHANNEL,
    params: {
      owners: xpubs
    } as NodeTypes.CreateChannelParams
  };
  const response: NodeTypes.MethodResponse = await node.call(req.type, req);
  const result = response.result as NodeTypes.CreateChannelTransactionResult;
  return result.transactionHash;
}

/**
 * Wrapper method making the call to the given node to get the list of
 * multisig addresses the node is aware of.
 * @param node
 * @returns list of multisig addresses
 */
export async function getChannelAddresses(node: Node): Promise<Set<string>> {
  const req: NodeTypes.MethodRequest = {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.GET_CHANNEL_ADDRESSES,
    params: {} as NodeTypes.CreateChannelParams
  };
  const response: NodeTypes.MethodResponse = await node.call(req.type, req);
  const result = response.result as NodeTypes.GetChannelAddressesResult;
  return new Set(result.multisigAddresses);
}

export async function getInstalledAppInstances(
  node: Node
): Promise<AppInstanceInfo[]> {
  return getApps(node, APP_INSTANCE_STATUS.INSTALLED);
}

export async function getInstalledAppInstanceInfo(
  node: Node,
  appInstanceId: string
): Promise<AppInstanceInfo> {
  const allAppInstanceInfos = await getApps(
    node,
    APP_INSTANCE_STATUS.INSTALLED
  );
  return allAppInstanceInfos.filter(appInstanceInfo => {
    appInstanceInfo.id === appInstanceId;
  })[0];
}

export async function getProposedAppInstances(
  node: Node
): Promise<AppInstanceInfo[]> {
  return getApps(node, APP_INSTANCE_STATUS.PROPOSED);
}

export async function getProposedAppInstanceInfo(
  node: Node,
  appInstanceId: string
): Promise<AppInstanceInfo> {
  const allProposedAppInstanceInfos = await getApps(
    node,
    APP_INSTANCE_STATUS.PROPOSED
  );
  return allProposedAppInstanceInfos.filter(appInstanceInfo => {
    return appInstanceInfo.id === appInstanceId;
  })[0];
}

export async function getFreeBalanceState(
  node: Node,
  multisigAddress: string
): Promise<ETHBucketAppState> {
  const req = {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.GET_FREE_BALANCE_STATE,
    params: {
      multisigAddress
    }
  };
  const response = await node.call(req.type, req);
  const result = response.result as NodeTypes.GetFreeBalanceStateResult;
  return result.state;
}

export async function getApps(
  node: Node,
  appInstanceStatus: APP_INSTANCE_STATUS
): Promise<AppInstanceInfo[]> {
  let request: NodeTypes.MethodRequest;
  let response: NodeTypes.MethodResponse;
  let result;
  if (appInstanceStatus === APP_INSTANCE_STATUS.INSTALLED) {
    request = {
      requestId: generateUUID(),
      type: NodeTypes.MethodName.GET_APP_INSTANCES,
      params: {} as NodeTypes.GetAppInstancesParams
    };
    response = await node.call(request.type, request);
    result = response.result as NodeTypes.GetAppInstancesResult;
    return result.appInstances;
  }
  request = {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.GET_PROPOSED_APP_INSTANCES,
    params: {} as NodeTypes.GetProposedAppInstancesParams
  };
  response = await node.call(request.type, request);
  result = response.result as NodeTypes.GetProposedAppInstancesResult;
  return result.appInstances;
}

export function makeDepositRequest(
  multisigAddress: string,
  amount: BigNumber
): NodeTypes.MethodRequest {
  return {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.DEPOSIT,
    params: {
      multisigAddress,
      amount
    } as NodeTypes.DepositParams
  };
}

export function makeWithdrawRequest(
  multisigAddress: string,
  amount: BigNumber
): NodeTypes.MethodRequest {
  return {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.WITHDRAW,
    params: {
      multisigAddress,
      amount
    } as NodeTypes.WithdrawParams
  };
}

export function makeInstallRequest(
  appInstanceId: string
): NodeTypes.MethodRequest {
  return {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.INSTALL,
    params: {
      appInstanceId
    } as NodeTypes.InstallParams
  };
}

export function makeRejectInstallRequest(
  appInstanceId: string
): NodeTypes.MethodRequest {
  return {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.REJECT_INSTALL,
    params: {
      appInstanceId
    } as NodeTypes.RejectInstallParams
  };
}

export function makeInstallProposalRequest(
  proposedToIdentifier: string,
  nullInitialState: boolean = false
): NodeTypes.MethodRequest {
  let initialState;

  if (!nullInitialState) {
    initialState = {
      foo: AddressZero,
      bar: Zero
    } as SolidityABIEncoderV2Type;
  }

  const params: NodeTypes.ProposeInstallParams = {
    proposedToIdentifier,
    initialState,
    appId: AddressZero,
    abiEncodings: {
      stateEncoding: "tuple(address foo, uint256 bar)",
      actionEncoding: undefined
    } as AppABIEncodings,
    asset: {
      assetType: AssetType.ETH
    } as BlockchainAsset,
    myDeposit: Zero,
    peerDeposit: Zero,
    timeout: One
  };
  return {
    params,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.PROPOSE_INSTALL
  } as NodeTypes.MethodRequest;
}

export function makeTTTProposalReq(
  proposedToIdentifier: string,
  appId: Address,
  initialState: SolidityABIEncoderV2Type,
  abiEncodings: AppABIEncodings
): NodeTypes.MethodRequest {
  return {
    params: {
      proposedToIdentifier,
      appId,
      initialState,
      abiEncodings,
      asset: {
        assetType: AssetType.ETH
      },
      myDeposit: Zero,
      peerDeposit: Zero,
      timeout: One
    } as NodeTypes.ProposeInstallParams,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.PROPOSE_INSTALL
  } as NodeTypes.MethodRequest;
}

export function makeInstallVirtualRequest(
  appInstanceId: string,
  intermediaries: Address[]
): NodeTypes.MethodRequest {
  return {
    params: {
      appInstanceId,
      intermediaries
    } as NodeTypes.InstallVirtualParams,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.INSTALL_VIRTUAL
  };
}

export function makeInstallVirtualProposalRequest(
  proposedToIdentifier: string,
  intermediaries: string[],
  nullInitialState: boolean = false
): NodeTypes.MethodRequest {
  const installProposalParams = makeInstallProposalRequest(
    proposedToIdentifier,
    nullInitialState
  ).params as NodeTypes.ProposeInstallParams;

  const installVirtualParams: NodeTypes.ProposeInstallVirtualParams = {
    ...installProposalParams,
    intermediaries
  };
  return {
    params: installVirtualParams,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.PROPOSE_INSTALL_VIRTUAL
  } as NodeTypes.MethodRequest;
}

/**
 * @param proposalParams The parameters of the installation proposal.
 * @param proposedAppInstanceInfo The proposed app instance contained in the Node.
 */
export function confirmProposedAppInstanceOnNode(
  methodParams: NodeTypes.MethodParams,
  proposedAppInstanceInfo: AppInstanceInfo
) {
  const proposalParams = methodParams as NodeTypes.ProposeInstallParams;
  expect(proposalParams.abiEncodings).toEqual(
    proposedAppInstanceInfo.abiEncodings
  );
  expect(proposalParams.appId).toEqual(proposedAppInstanceInfo.appId);
  expect(proposalParams.asset).toEqual(proposedAppInstanceInfo.asset);
  expect(proposalParams.myDeposit).toEqual(proposedAppInstanceInfo.myDeposit);
  expect(proposalParams.peerDeposit).toEqual(
    proposedAppInstanceInfo.peerDeposit
  );
  expect(proposalParams.timeout).toEqual(proposedAppInstanceInfo.timeout);
  // TODO: uncomment when getState is implemented
  // expect(proposalParams.initialState).toEqual(appInstanceInitialState);
}

export function confirmProposedVirtualAppInstanceOnNode(
  methodParams: NodeTypes.MethodParams,
  proposedAppInstance: AppInstanceInfo
) {
  confirmProposedAppInstanceOnNode(methodParams, proposedAppInstance);
  const proposalParams = methodParams as NodeTypes.ProposeInstallVirtualParams;
  expect(proposalParams.intermediaries).toEqual(
    proposedAppInstance.intermediaries
  );
}

const emptyNetworkMap = new Map(
  networkContextProps.map((i): [string, string] => [i, AddressZero])
);
export const EMPTY_NETWORK = Array.from(emptyNetworkMap.entries()).reduce(
  (main, [key, value]) => ({ ...main, [key]: value }),
  {}
) as NetworkContext;

export function generateGetStateRequest(
  appInstanceId: AppInstanceID
): NodeTypes.MethodRequest {
  return {
    params: {
      appInstanceId
    },
    requestId: generateUUID(),
    type: NodeTypes.MethodName.GET_STATE
  };
}

export function generateTakeActionRequest(
  appInstanceId: AppInstanceID,
  action: any
): NodeTypes.MethodRequest {
  return {
    params: {
      appInstanceId,
      action
    } as NodeTypes.TakeActionParams,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.TAKE_ACTION
  };
}

export function generateUninstallRequest(
  appInstanceId: AppInstanceID
): NodeTypes.MethodRequest {
  return {
    params: {
      appInstanceId
    } as NodeTypes.UninstallParams,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.UNINSTALL
  };
}

export function generateUninstallVirtualRequest(
  appInstanceId: AppInstanceID,
  intermediaryIdentifier: string
): NodeTypes.MethodRequest {
  return {
    params: {
      appInstanceId,
      intermediaryIdentifier
    } as NodeTypes.UninstallVirtualParams,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.UNINSTALL_VIRTUAL
  };
}

export function makeTTTVirtualAppInstanceProposalReq(
  proposedToIdentifier: string,
  appId: Address,
  initialState: SolidityABIEncoderV2Type,
  abiEncodings: AppABIEncodings,
  intermediaries: string[]
): NodeTypes.MethodRequest {
  return {
    params: {
      intermediaries,
      proposedToIdentifier,
      appId,
      initialState,
      abiEncodings,
      asset: {
        assetType: AssetType.ETH
      },
      myDeposit: Zero,
      peerDeposit: Zero,
      timeout: One
    } as NodeTypes.ProposeInstallVirtualParams,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.PROPOSE_INSTALL_VIRTUAL
  } as NodeTypes.MethodRequest;
}
