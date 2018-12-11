import { Address, AssetType, Node } from "@counterfactual/common-types";
import cuid from "cuid";
import { ethers } from "ethers";

export function makeProposalRequest(peerAddress: Address): Node.MethodRequest {
  const params: Node.ProposeInstallParams = {
    peerAddress,
    appId: "1",
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
