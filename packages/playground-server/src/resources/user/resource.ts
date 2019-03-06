import { Resource } from "@ebryn/jsonapi-ts";

export default class User extends Resource {
  // @ts-ignore
  public attributes: {
    username: string;
    ethAddress: string;
    nodeAddress: string;
    email: string;
    multisigAddress: string;
    transactionHash: string;
    token: string;
  };
}

export class MatchedUser extends Resource {
  // attributes: {
  //   username: string;
  //   ethAddress: string;
  //   nodeAddress: string;
  // };
}
