import { Resource } from "@ebryn/jsonapi-ts";

export default interface App extends Resource {
  attributes: {
    name: string;
    slug: string;
    icon: string;
    url: string;
  };
}
