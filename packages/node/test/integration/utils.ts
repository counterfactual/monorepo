import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  AppInstanceInfo,
  AppState,
  AssetType,
  BlockchainAsset,
  NetworkContext,
  Node as NodeTypes
} from "@counterfactual/types";
import { AddressZero, One, Zero } from "ethers/constants";
import { v4 as generateUUID } from "uuid";

import { Node } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";

export async function getNewMultisig(
  node: Node,
  owners: Address[]
): Promise<Address> {
  const req: NodeTypes.MethodRequest = {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.CREATE_MULTISIG,
    params: {
      owners
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

export async function getProposedAppInstances(
  node: Node
): Promise<AppInstanceInfo[]> {
  return getApps(node, APP_INSTANCE_STATUS.PROPOSED);
}

async function getApps(
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

export function makeInstallProposalRequest(
  respondingAddress: Address
): NodeTypes.MethodRequest {
  const params: NodeTypes.ProposeInstallParams = {
    respondingAddress: respondingAddress as Address,
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
    timeout: One,
    initialState: {
      foo: AddressZero,
      bar: 0
    } as AppState
  };
  return {
    params,
    requestId: generateUUID(),
    type: NodeTypes.MethodName.PROPOSE_INSTALL
  } as NodeTypes.MethodRequest;
}

export function makeInstallVirtualProposalRequest(
  respondingAddress: Address,
  intermediaries: Address[]
): NodeTypes.MethodRequest {
  const installProposalParams = makeInstallProposalRequest(respondingAddress)
    .params as NodeTypes.ProposeInstallParams;

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
