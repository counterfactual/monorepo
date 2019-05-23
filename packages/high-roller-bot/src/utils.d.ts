import { Node } from "@counterfactual/node";
import { Node as NodeTypes } from "@counterfactual/types";
export declare function getFreeBalance(node: Node, multisigAddress: string): Promise<NodeTypes.GetFreeBalanceStateResult>;
export declare function logEthFreeBalance(freeBalance: NodeTypes.GetFreeBalanceStateResult): void;
export declare function fetchMultisig(baseURL: string, token: string): Promise<string>;
export declare function deposit(node: Node, amount: string, multisigAddress: string): Promise<void>;
export declare function buildRegistrationSignaturePayload(data: any): string;
export declare function afterUser(botName: string, node: Node, botPublicIdentifer: string, multisigAddress: string): Promise<void>;
export declare function createAccount(baseURL: string, user: UserChangeset, signature: string): Promise<UserSession>;
export declare function getUser(baseURL: string, token: string): Promise<UserSession>;
export declare type AppDefinition = {
    id: string;
    name: string;
    notifications?: number;
    slug: string;
    url: string;
    icon: string;
};
export interface UserChangeset {
    username: string;
    email: string;
    ethAddress: string;
    nodeAddress: string;
}
export declare type UserSession = {
    id: string;
    username: string;
    ethAddress: string;
    nodeAddress: string;
    email: string;
    multisigAddress: string;
    transactionHash: string;
    token?: string;
};
export declare type ComponentEventHandler = (event: CustomEvent<any>) => void;
export interface ErrorMessage {
    primary: string;
    secondary: string;
}
export declare type APIError = {
    status: HttpStatusCode;
    code: ErrorCode;
    title: string;
    detail: string;
};
export declare type APIResource<T = APIResourceAttributes> = {
    type: APIResourceType;
    id?: string;
    attributes: T;
    relationships?: APIResourceRelationships;
};
export declare type APIResourceAttributes = {
    [key: string]: string | number | boolean | undefined;
};
export declare type APIResourceType = "user" | "matchmakingRequest" | "matchedUser" | "session" | "app";
export declare type APIResourceRelationships = {
    [key in APIResourceType]?: APIDataContainer;
};
export declare type APIDataContainer<T = APIResourceAttributes> = {
    data: APIResource<T> | APIResourceCollection<T>;
};
export declare type APIResourceCollection<T = APIResourceAttributes> = APIResource<T>[];
export declare type APIResponse<T = APIResourceAttributes> = APIDataContainer<T> & {
    errors?: APIError[];
    meta?: APIMetadata;
    included?: APIResourceCollection;
};
export declare enum ErrorCode {
    SignatureRequired = "signature_required",
    InvalidSignature = "invalid_signature",
    AddressAlreadyRegistered = "address_already_registered",
    AppRegistryNotAvailable = "app_registry_not_available",
    UserAddressRequired = "user_address_required",
    NoUsersAvailable = "no_users_available",
    UnhandledError = "unhandled_error",
    UserNotFound = "user_not_found",
    TokenRequired = "token_required",
    InvalidToken = "invalid_token",
    UsernameAlreadyExists = "username_already_exists"
}
export declare enum HttpStatusCode {
    OK = 200,
    Created = 201,
    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    InternalServerError = 500
}
export declare type APIMetadata = {
    [key: string]: string | number | boolean | APIMetadata;
};
export declare type APIRequest<T = APIResourceAttributes> = {
    data?: APIResource<T> | APIResourceCollection<T>;
    meta?: APIMetadata;
};
export declare type UserAttributes = {
    id: string;
    username: string;
    ethAddress: string;
    nodeAddress: string;
    email: string;
    multisigAddress: string;
    transactionHash: string;
    token?: string;
};
export declare type SessionAttributes = {
    ethAddress: string;
};
export declare type AppAttributes = {
    name: string;
    slug: string;
    icon: string;
    url: string;
};
