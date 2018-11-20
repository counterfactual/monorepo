import {
  NodeInstallProposalData,
  NodeMessageType
} from "@counterfactual/node-provider";
import { BigNumber, BigNumberish } from "ethers/utils";

import { AppDefinition, BlockchainAsset } from "./app-types";
import { Provider } from "./provider";
import { Address, AppInstanceID } from "./simple-types";

export interface InstallProposalRequest {
  peerAddress: Address;
  asset: BlockchainAsset;
  myDeposit: BigNumberish;
  peerDeposit: BigNumberish;
  initialState: any;
}

export class AppFactory {
  constructor(
    readonly provider: Provider,
    readonly appDefinition: AppDefinition
  ) {}

  async proposeInstall(
    proposal: InstallProposalRequest
  ): Promise<AppInstanceID> {
    const response = await this.provider.sendRawNodeRequest(
      NodeMessageType.PROPOSE_INSTALL,
      {
        assetType: proposal.asset.assetType,
        token: proposal.asset.token,
        peerAddress: proposal.peerAddress,
        myDeposit: new BigNumber(proposal.myDeposit).toString(),
        peerDeposit: new BigNumber(proposal.peerDeposit).toString(),
        initialState: proposal.initialState,
        appDefinition: this.appDefinition
      }
    );
    return (response.data as NodeInstallProposalData).appInstanceId!;
  }
}
