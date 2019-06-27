export type AuthenticatedRequest = {
  headers: {
    authorization: string;
  };
};

export type JsonApiResource = {
  id?: string;
  type: string;
  attributes: {
    [key: string]: string | number | boolean;
  };
  relationships?: {
    type: string;
    id: string;
  };
};
