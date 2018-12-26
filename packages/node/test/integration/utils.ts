import {
  Address,
  AppInstanceInfo,
  AssetType,
  Node as NodeTypes
} from "@counterfactual/common-types";
import cuid from "cuid";
import { One } from "ethers/constants";

import { Node } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/models";

export async function getNewMultisig(
  node: Node,
  owners: Address[]
): Promise<Address> {
  const req: NodeTypes.MethodRequest = {
    requestId: cuid(),
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
    requestId: cuid(),
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
      requestId: cuid(),
      type: NodeTypes.MethodName.GET_APP_INSTANCES,
      params: {} as NodeTypes.GetAppInstancesParams
    };
    response = await node.call(request.type, request);
    result = response.result as NodeTypes.GetAppInstancesResult;
    return result.appInstances;
  }
  request = {
    requestId: cuid(),
    type: NodeTypes.MethodName.GET_PROPOSED_APP_INSTANCES,
    params: {} as NodeTypes.GetProposedAppInstancesParams
  };
  response = await node.call(request.type, request);
  result = response.result as NodeTypes.GetProposedAppInstancesResult;
  return result.appInstances;
}

export function makeProposalRequest(
  peerAddress: Address
): NodeTypes.MethodRequest {
  const params: NodeTypes.ProposeInstallParams = {
    peerAddress,
    appId: cuid(),
    abiEncodings: {
      stateEncoding: "stateEncoding",
      actionEncoding: "actionEncoding"
    },
    asset: {
      assetType: AssetType.ETH
    },
    myDeposit: One,
    peerDeposit: One,
    timeout: One,
    initialState: {
      propertyA: "A",
      propertyB: "B"
    }
  };
  return {
    params,
    requestId: cuid(),
    type: NodeTypes.MethodName.PROPOSE_INSTALL
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
