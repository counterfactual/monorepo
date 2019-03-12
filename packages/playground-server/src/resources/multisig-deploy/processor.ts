import { Operation, OperationProcessor } from "@ebryn/jsonapi-ts";

import { getUser } from "../../db";
import NodeWrapper from "../../node";
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

    return {
      type: "multisig-deploy",
      id: transactionHash
    } as MultisigDeploy;
  }
}
