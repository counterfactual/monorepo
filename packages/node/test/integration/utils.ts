import {
  Address,
  AppInstanceInfo,
  AssetType,
  Node as NodeTypes
} from "@counterfactual/common-types";
import cuid from "cuid";
import { ethers } from "ethers";

import { Node } from "../../src";

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  const req: NodeTypes.MethodRequest = {
    requestId: cuid(),
    type: NodeTypes.MethodName.GET_APP_INSTANCES,
    params: {} as NodeTypes.GetAppInstancesParams
  };
  const response: NodeTypes.MethodResponse = await node.call(
    NodeTypes.MethodName.GET_APP_INSTANCES,
    req
  );
  const result = response.result as NodeTypes.GetAppInstancesResult;
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
    myDeposit: ethers.utils.bigNumberify("1"),
    peerDeposit: ethers.utils.bigNumberify("1"),
    timeout: ethers.utils.bigNumberify("1"),
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
