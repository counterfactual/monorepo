import { createMemoryHistory, MemoryHistory } from "history";
import { RoutePath } from "../../types";
import callAction, { ActionResult } from "../test-utils/call-action";
import EthereumMock, {
  enableEthereumMockBehavior,
  ETHEREUM_MOCK_BALANCE,
  TRANSACTION_MOCK_HASH
} from "../test-utils/ethereum.mock";
import {
  postMultisigDeploy,
  postSessionWithoutUser,
  postUser,
  postUserWithoutUsername
} from "../test-utils/hub-api-client.mock";
import JsonRpcSignerMock from "../test-utils/json-rpc-signer.mock";
import Web3ProviderMock from "../test-utils/web3provider.mock";
import { ActionType, User, UserState } from "../types";
import {
  addUser,
  getUser,
  initialState,
  loginUser,
  reducers,
  UserAddTransition
} from "./user";
import { USER_MOCK_BALANCE, USER_MOCK_DATA } from "./user.mock";

describe("Store > User", () => {
  let history: MemoryHistory;
  let provider: Web3ProviderMock;
  let signer: JsonRpcSignerMock;

  beforeEach(() => {
    fetchMock.resetMocks();

    window.ethereum = new EthereumMock();
    history = createMemoryHistory();

    provider = new Web3ProviderMock(window.ethereum);
    signer = provider.getSigner();
  });

  describe("addUser()", () => {
    beforeEach(() => {
      enableEthereumMockBehavior("nodeAddressFromUserMock");
      enableEthereumMockBehavior("multisigAddressFromUserMock");
    });

    it("should add a user and redirect to the Deposit screen", async () => {
      const POST_USER_MOCK_RESPONSE = postUser();
      const POST_MULTISIG_DEPLOY_MOCK_RESPONSE = postMultisigDeploy();

      fetchMock.mockResponses(
        [POST_USER_MOCK_RESPONSE, { status: 201 }],
        [POST_MULTISIG_DEPLOY_MOCK_RESPONSE, { status: 201 }]
      );

      expect(history.length).toBe(1);
      expect(history.location.pathname).toEqual(RoutePath.Root);

      const { dispatchedActions, reducedStates } = await callAction<
        User,
        UserState,
        UserAddTransition
      >(addUser, {
        reducers,
        initialState,
        actionParameters: [USER_MOCK_DATA, signer, history],
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

      expect((window.ethereum as EthereumMock).token).toEqual(
        USER_MOCK_DATA.token
      );

      expect(history.length).toBe(2);
      expect(history.location.pathname).toEqual(RoutePath.SetupDeposit);
    });

    it("should fail to add a user if an error occurs on the API", async () => {
      const USER_WITHOUT_USERNAME_MOCK = { ...USER_MOCK_DATA, username: "" };
      const POST_USER_MOCK_RESPONSE = postUserWithoutUsername();

      fetchMock.mockRejectOnce(JSON.parse(POST_USER_MOCK_RESPONSE));

      try {
        await callAction<User, UserState, UserAddTransition>(addUser, {
          reducers,
          initialState,
          actionParameters: [USER_WITHOUT_USERNAME_MOCK, signer, history],
          finalActionType: ActionType.UserAdd
        });
        fail("User should not have been created");
      } catch (e) {
        const {
          dispatchedActions,
          reducedStates
        }: ActionResult<UserState, UserState, UserAddTransition> = e;

        expect(dispatchedActions.length).toBe(1);
        expect(reducedStates.length).toBe(3);

        expect(dispatchedActions).toEqual([
          {
            type: ActionType.UserError,
            data: {
              error: {
                code: "username_required"
              }
            }
          }
        ]);

        expect(reducedStates).toEqual([
          { ...initialState, status: UserAddTransition.CheckWallet },
          { ...initialState, status: UserAddTransition.CreatingAccount },
          {
            ...initialState,
            status: ActionType.UserError,
            error: dispatchedActions[0].data.error
          }
        ]);
      }
    });
  });

  describe("loginUser()", () => {
    beforeEach(() => {
      enableEthereumMockBehavior("nodeAddressFromUserMock");
      enableEthereumMockBehavior("multisigAddressFromUserMock");
    });

    it("should login a user and redirect to the Channel screen", async () => {
      const POST_USER_MOCK_RESPONSE = postUser();

      fetchMock.mockResponses([POST_USER_MOCK_RESPONSE, { status: 201 }]);

      expect(history.length).toBe(1);
      expect(history.location.pathname).toEqual(RoutePath.Root);

      const { dispatchedActions, reducedStates } = await callAction<
        User,
        UserState,
        UserAddTransition
      >(loginUser, {
        reducers,
        initialState,
        actionParameters: [USER_MOCK_DATA.ethAddress, signer, history],
        finalActionType: ActionType.UserLogin
      });

      expect(dispatchedActions.length).toBe(1);
      expect(reducedStates.length).toBe(1);

      expect(dispatchedActions).toEqual([
        { data: { user: USER_MOCK_DATA }, type: ActionType.UserLogin }
      ]);

      expect(reducedStates).toEqual([
        { user: USER_MOCK_DATA, error: {}, status: ActionType.UserLogin }
      ]);

      expect((window.ethereum as EthereumMock).token).toEqual(
        USER_MOCK_DATA.token
      );

      expect(history.length).toBe(2);
      expect(history.location.pathname).toEqual(RoutePath.Channels);
    });

    it("should fail to login if an error occurs on the API", async () => {
      const POST_SESSION_MOCK_RESPONSE = postSessionWithoutUser();

      fetchMock.mockRejectOnce(JSON.parse(POST_SESSION_MOCK_RESPONSE));

      try {
        await callAction<User, UserState, UserAddTransition>(loginUser, {
          reducers,
          initialState,
          actionParameters: [USER_MOCK_DATA.ethAddress, signer, history],
          finalActionType: ActionType.UserLogin
        });
        fail("Login should not have proceeded.");
      } catch (e) {
        const {
          dispatchedActions,
          reducedStates
        }: ActionResult<UserState, UserState, UserAddTransition> = e;

        expect(dispatchedActions).toEqual([
          {
            data: {
              error: {
                message: "Something is wrong with that token",
                code: "invalid_token",
                field: ""
              }
            },
            type: ActionType.UserError
          }
        ]);

        expect(reducedStates).toEqual([
          {
            user: {},
            status: ActionType.UserError,
            error: dispatchedActions[0].data.error
          }
        ]);
      }
    });
  });

  describe("getUser()", () => {
    it("should not dispatch anything if there is no user logged in", async () => {
      enableEthereumMockBehavior("returnEmptyUserOnRequestUser");

      try {
        await callAction<User, UserState, UserAddTransition>(getUser, {
          reducers,
          initialState,
          actionParameters: [provider, history],
          finalActionType: ActionType.WalletSetBalance
        });
        fail(
          "Actions were dispateched without a user, this should not happen."
        );
      } catch (e) {
        expect(e).toEqual("TEST_TIMEOUT");
      }
    });

    it("should get the logged in user and their balance", async () => {
      const { dispatchedActions, reducedStates } = await callAction<
        User,
        UserState,
        UserAddTransition
      >(getUser, {
        reducers,
        initialState,
        actionParameters: [provider, history],
        finalActionType: ActionType.WalletSetBalance
      });

      expect(dispatchedActions.length).toBe(2);
      expect(reducedStates.length).toBe(2);

      expect(dispatchedActions).toEqual([
        {
          data: { user: USER_MOCK_DATA },
          type: ActionType.UserGet
        },
        {
          data: {
            counterfactualBalance: USER_MOCK_BALANCE,
            ethereumBalance: ETHEREUM_MOCK_BALANCE
          },
          type: ActionType.WalletSetBalance
        }
      ]);

      expect(reducedStates).toEqual([
        {
          user: USER_MOCK_DATA,
          error: {},
          status: ActionType.UserGet
        },
        {
          user: USER_MOCK_DATA,
          error: {},
          status: ActionType.WalletSetBalance
        }
      ]);
    });
  });
});
