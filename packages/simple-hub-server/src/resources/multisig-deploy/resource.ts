import { Resource } from "@ebryn/jsonapi-ts";

export default class MultisigDeploy extends Resource {
  static get type() {
    return "multisigDeploy";
  }

  static attributes = {
    ethAddress: "",
    transactionHash: ""
  };
}
