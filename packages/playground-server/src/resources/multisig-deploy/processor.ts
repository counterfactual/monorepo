import { Operation, OperationProcessor } from "@ebryn/jsonapi-ts";

import { getUser } from "../../db";
import { NodeWrapper } from "../../node";
import informSlack from "../../utils";
import User from "../user/resource";

import MultisigDeploy from "./resource";

export default class MultisigDeployProcessor extends OperationProcessor<
  MultisigDeploy
> {
  public resourceClass = MultisigDeploy;

  public async add(op: Operation): Promise<MultisigDeploy> {
    const user = await getUser({ attributes: op.data.attributes } as Partial<
      User
    >);

    const { transactionHash } = await NodeWrapper.createStateChannelFor(
      user.attributes.nodeAddress
    );

    informSlack(
      `📄 *MULTISIG_TX_BROADCASTED* (_${
        user.attributes.username
      }_) | Broadcasted multisig creation transaction <http://kovan.etherscan.io/tx/${transactionHash}|_(view on etherscan)_>.`
    );

    return {
      type: "multisig-deploy",
      id: transactionHash
    } as MultisigDeploy;
  }
}
