import { Resource } from "@ebryn/jsonapi-ts";

export default class User extends Resource {
  // attributes: {
  //   username: string;
  //   ethAddress: string;
  //   nodeAddress: string;
  //   email: string;
  //   multisigAddress: string;
  //   token?: string;
  // };
}

export class MatchedUser extends Resource {
  // attributes: {
  //   username: string;
  //   ethAddress: string;
  //   nodeAddress: string;
  // };
}
