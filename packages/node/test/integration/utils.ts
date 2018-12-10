import { Address, AssetType, Node } from "@counterfactual/common-types";
import { ethers } from "ethers";

export function makeProposalReq(peerAddress: Address): Node.MethodRequest {
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
  const appInstanceInstallationProposalRequestId = "2";
  return {
    params,
    requestId: appInstanceInstallationProposalRequestId,
    type: Node.MethodName.PROPOSE_INSTALL
  } as Node.MethodRequest;
}
