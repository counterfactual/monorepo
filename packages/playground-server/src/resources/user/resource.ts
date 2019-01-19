import { Resource } from "@ebryn/jsonapi-ts";

export default interface User extends Resource {
  attributes: {
    username: string;
    ethAddress: string;
    nodeAddress: string;
    email: string;
    multisigAddress: string;
    token?: string;
  };
}

export interface MatchedUser extends Resource {
  attributes: {
    username: string;
    ethAddress: string;
    nodeAddress: string;
  };
}
