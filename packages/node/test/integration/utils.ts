import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  AppInstanceInfo,
  AssetType,
  BlockchainAsset,
  NetworkContext,
  Node as NodeTypes,
  SolidityABIEncoderV2Struct
} from "@counterfactual/types";
import { AddressZero, One, Zero } from "ethers/constants";
import { v4 as generateUUID } from "uuid";

import { Node } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";

export async function getNewMultisig(
  node: Node,
  xpubs: string[]
): Promise<Address> {
  const req: NodeTypes.MethodRequest = {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.CREATE_MULTISIG,
    params: {
      owners: xpubs
    } as NodeTypes.CreateMultisigParams
  };
  const response: NodeTypes.MethodResponse = await node.call(req.type, req);
  const result = response.result as NodeTypes.CreateMultisigResult;
  return result.multisigAddress;
}

/**
 * Wrapper method making the call to the given node to get the list of
 * multisig addresses the node is aware of.
 * @param node
 * @returns list of multisig addresses
 */
export async function getChannelAddresses(node: Node): Promise<Address[]> {
  const req: NodeTypes.MethodRequest = {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.GET_CHANNEL_ADDRESSES,
    params: {} as NodeTypes.CreateMultisigParams
  };
  const response: NodeTypes.MethodResponse = await node.call(req.type, req);
  const result = response.result as NodeTypes.GetChannelAddressesResult;
  return result.multisigAddresses;
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
  respondingAddress: Address,
  nullInitialState: boolean = false
): NodeTypes.MethodRequest {
  let initialState = null;

  if (!nullInitialState) {
    initialState = {
      foo: AddressZero,
      bar: Zero
    } as SolidityABIEncoderV2Struct;
  }

  const params: NodeTypes.ProposeInstallParams = {
    respondingAddress,
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
  respondingAddress: string,
  intermediaries: string[],
  nullInitialState: boolean = false
): NodeTypes.MethodRequest {
  const installProposalParams = makeInstallProposalRequest(
    respondingAddress,
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
 * @param proposedAppInstance The proposed app instance contained in the Node.
 */
export function confirmProposedAppInstanceOnNode(
  methodParams: NodeTypes.MethodParams,
  proposedAppInstance: AppInstanceInfo
) {
  const proposalParams = methodParams as NodeTypes.ProposeInstallParams;
  expect(proposalParams.abiEncodings).toEqual(proposedAppInstance.abiEncodings);
  expect(proposalParams.appId).toEqual(proposedAppInstance.appId);
  expect(proposalParams.asset).toEqual(proposedAppInstance.asset);
  expect(proposalParams.myDeposit).toEqual(proposedAppInstance.myDeposit);
  expect(proposalParams.peerDeposit).toEqual(proposedAppInstance.peerDeposit);
  expect(proposalParams.timeout).toEqual(proposedAppInstance.timeout);
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

export const EMPTY_NETWORK: NetworkContext = {
  AppRegistry: AddressZero,
  ETHBalanceRefund: AddressZero,
  ETHBucket: AddressZero,
  MultiSend: AddressZero,
  NonceRegistry: AddressZero,
  StateChannelTransaction: AddressZero,
  ETHVirtualAppAgreement: AddressZero
};

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
