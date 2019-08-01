import { parseEther } from "ethers/utils";
import { createMemoryHistory } from "history";
import { RoutePath } from "../../types";
import callAction, { ActionResult } from "../test-utils/call-action";
import EthereumMock, {
  enableEthereumMockBehavior,
  ETHEREUM_MOCK_ADDRESS,
  ETHEREUM_MOCK_BALANCE,
  MULTISIG_MOCK_ADDRESS,
  NODE_MOCK_ADDRESS
} from "../test-utils/ethereum.mock";
import Web3ProviderMock from "../test-utils/web3provider.mock";
import { ActionType, WalletState } from "../types";
import { USER_MOCK_BALANCE } from "../user/user.mock";
import {
  connectToWallet,
  deposit,
  initialState,
  reducers,
  WalletDepositTransition
} from "./wallet";

describe("Store > Wallet", () => {
  beforeEach(() => {
    window.ethereum = new EthereumMock();
  });

  describe("connectToWallet()", () => {
    it("should fail if user didn't allow access to the wallet", async () => {
      enableEthereumMockBehavior("failOnEnable");

      try {
        await callAction(connectToWallet, { initialState, reducers });
        fail("Should have thrown error message");
      } catch (e) {
        const {
          dispatchedActions,
          reducedStates
        }: ActionResult<WalletState> = e;
        const [{ data }] = dispatchedActions;
        const [state] = reducedStates;

        expect(dispatchedActions.length).toBe(1);
        expect(reducedStates.length).toBe(1);

        expect(data.error.message).toBe(
          "You must allow Counterfactual to connect with Metamask in order to use it."
        );

        expect(state.error).toEqual(data.error);
      }
    });
    it("should dispatch a WALLET_SET_ADDRESS action with the expected information when user allows access to the wallet", async () => {
      const { dispatchedActions, reducedStates } = await callAction<
        WalletState
      >(connectToWallet, { initialState, reducers });
      const [{ data, type }] = dispatchedActions;

      expect(type).toBe(ActionType.WalletSetAddress);
      expect(data.error).toBe(undefined);
      expect(data.ethAddress).toBe(ETHEREUM_MOCK_ADDRESS);

      const [state] = reducedStates;

      expect(state.ethAddress).toBe(data.ethAddress);
      expect(state.status).toBe(type);
      expect(state.error).toEqual({});
    });
  });
  describe("deposit()", () => {
    let web3Provider: Web3ProviderMock;

    beforeEach(() => {
      window.ethereum = new EthereumMock();
      window.ethereum.enable();

      web3Provider = new Web3ProviderMock(window.ethereum);
    });
    it("should fail if user rejects to deposit", async () => {
      enableEthereumMockBehavior("rejectDeposit");

      try {
        await callAction<WalletState>(deposit, {
          reducers,
          actionParameters: [
            {
              amount: parseEther("1.0"),
              ethAddress: window.ethereum.selectedAddress,
              multisigAddress: MULTISIG_MOCK_ADDRESS,
              nodeAddress: NODE_MOCK_ADDRESS
            },
            web3Provider
          ],
          finalActionType: ActionType.WalletSetBalance
        });
        fail("Deposit should have never proceeded.");
      } catch (e) {
        const {
          dispatchedActions,
          reducedStates
        }: ActionResult<WalletState> = e;
        expect(dispatchedActions.length).toBe(1);
        expect(reducedStates.length).toBe(2);

        const [{ data }] = dispatchedActions;
        const [transitionState, errorState] = reducedStates;

        expect(data.error.message).toContain("because of");
        expect(transitionState.status).toEqual(
          WalletDepositTransition.CheckWallet
        );
        expect(errorState.status).toEqual(ActionType.WalletError);
        expect(errorState.error).toEqual(data.error);
      }
    });
    it("should dispatch WALLET_DEPOSIT_CHECK_WALLET, WALLET_DEPOSIT_WAIT_FOR_FUNDS, WALLET_SET_BALANCE", async () => {
      const { dispatchedActions, reducedStates } = await callAction<
        WalletState
      >(deposit, {
        reducers,
        actionParameters: [
          {
            amount: parseEther("1.0"),
            ethAddress: window.ethereum.selectedAddress,
            multisigAddress: MULTISIG_MOCK_ADDRESS,
            nodeAddress: NODE_MOCK_ADDRESS
          },
          web3Provider
        ],
        finalActionType: ActionType.WalletSetBalance
      });

      expect(dispatchedActions).toEqual([
        { type: WalletDepositTransition.CheckWallet },
        { type: WalletDepositTransition.WaitForUserFunds },
        { type: WalletDepositTransition.WaitForCollateralFunds },
        {
          data: {
            counterfactualBalance: USER_MOCK_BALANCE,
            ethereumBalance: ETHEREUM_MOCK_BALANCE
          },
          type: ActionType.WalletSetBalance
        }
      ]);

      expect(reducedStates).toEqual([
        { status: WalletDepositTransition.CheckWallet },
        { status: WalletDepositTransition.WaitForUserFunds },
        { status: WalletDepositTransition.WaitForCollateralFunds },
        {
          status: ActionType.WalletSetBalance,
          counterfactualBalance: USER_MOCK_BALANCE,
          ethereumBalance: ETHEREUM_MOCK_BALANCE
        }
      ]);
    });
    it("should should redirect to /channels if the History object is provided", async () => {
      const history = createMemoryHistory();

      expect(history.length).toBe(1);
      expect(history.location.pathname).toBe(RoutePath.Root);

      await callAction<WalletState>(deposit, {
        reducers,
        actionParameters: [
          {
            amount: parseEther("1.0"),
            ethAddress: window.ethereum.selectedAddress,
            multisigAddress: MULTISIG_MOCK_ADDRESS,
            nodeAddress: NODE_MOCK_ADDRESS
          },
          web3Provider,
          history
        ],
        finalActionType: ActionType.WalletSetBalance
      });

      expect(history.length).toBe(2);
      expect(history.location.pathname).toBe(RoutePath.Channels);
    });
  });
});
