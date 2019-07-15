import { User } from "../types";
import { USER_MOCK_DATA } from "../user/user.mock";
import { TRANSACTION_MOCK_HASH } from "./ethereum.mock";

export const postUser = (user: User = USER_MOCK_DATA) =>
  JSON.stringify({
    type: "user",
    data: {
      id: Date.now(),
      attributes: { ...user },
      relationships: {}
    }
  });

export const postMultisigDeploy = () =>
  JSON.stringify({
    type: "multisig-deploy",
    data: {
      id: TRANSACTION_MOCK_HASH
    }
  });
