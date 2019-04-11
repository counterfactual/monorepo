import { Resource } from "@ebryn/jsonapi-ts";

export default class Proposal extends Resource {
  static schema = {
    attributes: {
      appId: String,
      abiEncodings: Object,
      asset: Object,
      myDeposit: Object,
      peerDeposit: Object,
      timeout: Object,
      initialState: Object,
      proposedToIdentifier: String,
      appInstanceId: String,
      intermediaries: Array
    },

    relationships: {}
  };
}
