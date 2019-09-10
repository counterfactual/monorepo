import { EthereumCommitment } from "../ethereum/types";

import { AppInstanceProposal } from ".";
import { StateChannel } from "./state-channel";

export class SharedData {
  public stateChannelsMap: Map<string, StateChannel>;
  public proposals: Map<string, AppInstanceProposal>;
  public commitments: EthereumCommitment[];
}
