import { createMemoryHistory, MemoryHistory } from "history";
import callAction from "../test-utils/call-action";
import EthereumMock, {
  enableEthereumMockBehavior,
  TRANSACTION_MOCK_HASH
} from "../test-utils/ethereum.mock";
import {
  postMultisigDeploy,
  postUser
} from "../test-utils/hub-api-client.mock";
import Web3ProviderMock from "../test-utils/web3provider.mock";
import { ActionType, User, UserState } from "../types";
import { addUser, initialState, reducers, UserAddTransition } from "./user";
import { USER_MOCK_DATA } from "./user.mock";

describe("Store > User", () => {
  let history: MemoryHistory;

  beforeEach(() => {
    fetchMock.resetMocks();
    window.ethereum = new EthereumMock();
    history = createMemoryHistory();

    enableEthereumMockBehavior("nodeAddressFromUserMock");
    enableEthereumMockBehavior("multisigAddressFromUserMock");
  });

  it("should add an user", async () => {
    const POST_USER_MOCK_RESPONSE = postUser();
    const POST_MULTISIG_DEPLOY_MOCK_RESPONSE = postMultisigDeploy();

    fetchMock.mockResponses(
      [POST_USER_MOCK_RESPONSE, { status: 201 }],
      [POST_MULTISIG_DEPLOY_MOCK_RESPONSE, { status: 201 }]
    );

    const { dispatchedActions, reducedStates } = await callAction<
      User,
      UserState,
      UserAddTransition
    >(addUser, {
      reducers,
      initialState,
      actionParameters: [
        USER_MOCK_DATA,
        new Web3ProviderMock(window.ethereum).getSigner(),
        history
      ],
      finalActionType: ActionType.UserAdd
    });

    expect(dispatchedActions).toEqual([
      { type: UserAddTransition.CheckWallet },
      { type: UserAddTransition.CreatingAccount },
      { type: UserAddTransition.DeployingContract },
      {
        type: ActionType.UserAdd,
        data: {
          user: {
            ...USER_MOCK_DATA,
            transactionHash: TRANSACTION_MOCK_HASH
          }
        }
      }
    ]);

    expect(reducedStates).toEqual([
      { ...initialState, status: UserAddTransition.CheckWallet },
      { ...initialState, status: UserAddTransition.CreatingAccount },
      { ...initialState, status: UserAddTransition.DeployingContract },
      {
        ...initialState,
        status: ActionType.UserAdd,
        user: {
          ...USER_MOCK_DATA,
          transactionHash: TRANSACTION_MOCK_HASH
        }
      }
    ]);
  });

  it("should fail to add an user without username", async () => {
    const USER_WITHOUT_USERNAME_MOCK = { ...USER_MOCK_DATA, username: "" };
    const POST_USER_MOCK_RESPONSE = postUser(USER_WITHOUT_USERNAME_MOCK);
    const POST_MULTISIG_DEPLOY_MOCK_RESPONSE = postMultisigDeploy();
  });
});
