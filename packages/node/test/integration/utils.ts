import {
  Address,
  AppInstanceInfo,
  AssetType,
  Node
} from "@counterfactual/common-types";
import cuid from "cuid";
import { ethers } from "ethers";

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function makeProposalRequest(peerAddress: Address): Node.MethodRequest {
  const params: Node.ProposeInstallParams = {
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
  const appInstanceInstallationProposalRequestId = cuid();
  return {
    params,
    requestId: appInstanceInstallationProposalRequestId,
    type: Node.MethodName.PROPOSE_INSTALL
  } as Node.MethodRequest;
}

export function makeMultisigRequest(owners: Address[]): Node.MethodRequest {
  const multisigCreationRequstId = cuid();
  const multisigCreationReq: Node.MethodRequest = {
    requestId: multisigCreationRequstId,
    type: Node.MethodName.CREATE_MULTISIG,
    params: {
      owners
    } as Node.CreateMultisigParams
  };
  return multisigCreationReq;
}

/**
 * @param proposalParams The parameters of the installation proposal.
 * @param proposedAppInstance The proposed app instance contained in the Node.
 */
export function confirmProposedAppInstanceOnNode(
  methodParams: Node.MethodParams,
  proposedAppInstance: AppInstanceInfo
) {
  const proposalParams = methodParams as Node.ProposeInstallParams;
  expect(proposalParams.abiEncodings).toEqual(proposedAppInstance.abiEncodings);
  expect(proposalParams.appId).toEqual(proposedAppInstance.appId);
  expect(proposalParams.asset).toEqual(proposedAppInstance.asset);
  expect(proposalParams.myDeposit).toEqual(proposedAppInstance.myDeposit);
  expect(proposalParams.peerDeposit).toEqual(proposedAppInstance.peerDeposit);
  expect(proposalParams.timeout).toEqual(proposedAppInstance.timeout);
  // TODO: uncomment when getState is implemented
  // expect(proposalParams.initialState).toEqual(appInstanceInitialState);
}
