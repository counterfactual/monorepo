import { Resource } from "@ebryn/jsonapi-ts";

export default class SessionRequest extends Resource {
  static get type() {
    return "sessionRequest";
  }

  static attributes = {
    username: "",
    email: "",
    ethAddress: "",
    multisigAddress: "",
    nodeAddress: "",
    token: ""
  };
}
