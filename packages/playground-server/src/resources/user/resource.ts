import { Resource } from "@ebryn/jsonapi-ts";

export default class User extends Resource {
  static get type() {
    return "type";
  }

  static attributes = {
    username: "",
    ethAddress: "",
    nodeAddress: "",
    email: "",
    multisigAddress: "",
    transactionHash: "",
    token: ""
  };
}

export class MatchedUser extends Resource {
  static get type() {
    return "matchedUser";
  }

  static attributes = {
    username: "",
    ethAddress: "",
    nodeAddress: ""
  }
}
