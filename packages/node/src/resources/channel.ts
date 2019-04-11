import { Resource } from "@ebryn/jsonapi-ts";

export default class Channel extends Resource {
  static schema = {
    attributes: {
      owners: Array,
      transactionHash: String,
      multisigAddress: String,
      counterpartyXPub: String,
      alice: String,
      bob: String,
      aliceBalance: Object,
      bobBalance: Object,
      balance: Object,
      amount: String,
      notifyCounterparty: Boolean,
      recipient: String
    },

    relationships: {}
  };
}
