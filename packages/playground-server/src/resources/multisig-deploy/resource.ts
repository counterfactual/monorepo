import { Resource } from "@ebryn/jsonapi-ts";

export default class MultisigDeploy extends Resource {
  // @ts-ignore
  public attributes: {
    ethAddress: string;
    transactionHash: string;
  };
}
