import { User } from "../types";
import { USER_ID_MOCK, USER_MOCK_DATA } from "../user/user.mock";
import { TRANSACTION_MOCK_HASH } from "./ethereum.mock";

export const postUser = (user: User = USER_MOCK_DATA) =>
  JSON.stringify({
    type: "user",
    data: {
      id: USER_ID_MOCK,
      attributes: { ...user },
      relationships: {}
    }
  });

export const postUserWithoutUsername = () =>
  JSON.stringify({
    status: 400,
    code: "username_required"
  });

export const postMultisigDeploy = () =>
  JSON.stringify({
    type: "multisig-deploy",
    data: {
      id: TRANSACTION_MOCK_HASH
    }
  });

export const postSessionWithoutUser = () =>
  JSON.stringify({
    status: 422,
    code: "invalid_token"
  });
