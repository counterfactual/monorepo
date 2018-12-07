export interface AppDefinition {
  name: string;
  notifications?: number;
  slug: string;
  url: string;
  icon: string;
}

export interface UserChangeset {
  username: string;
  email: string;
  address: string;
}