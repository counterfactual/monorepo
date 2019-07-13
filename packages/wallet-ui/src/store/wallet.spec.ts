import { One } from "ethers/constants";
import { parseEther } from "ethers/utils";
import { createMemoryHistory } from "history";
import { RoutePath } from "../types";
import callAction from "../utils/call-action";
import EthereumMock, {
  enableEthereumMockBehavior,
  ETHEREUM_MOCK_ADDRESS,
  MULTISIG_MOCK_ADDRESS,
  NODE_MOCK_ADDRESS
} from "./ethereum.mock";
import { ActionType, StoreAction, WalletState } from "./types";
import { connectToWallet, deposit, WalletDepositTransition } from "./wallet";
import Web3ProviderMock from "./web3provider.mock";

// TODO: Test store states after implementing reducers in CallAction.

describe("Store > Wallet", () => {
  beforeEach(() => {
    window.ethereum = new EthereumMock();
  });

  describe("connectToWallet()", () => {
    it("should fail if user didn't allow access to the wallet", async () => {
      enableEthereumMockBehavior("failOnEnable");

      try {
        await callAction(connectToWallet);
        fail("Should have thrown error message");
      } catch (e) {
        const [{ data }] = e as StoreAction<WalletState>[];
        expect(data.error.message).toBe(
          "You must allow Counterfactual to connect with Metamask in order to use it."
        );
      }
    });
    it("should dispatch a WALLET_SET_ADDRESS action with the expected information when user allows access to the wallet", async () => {
      const [{ data, type }] = await callAction(connectToWallet);

      expect(type).toBe(ActionType.WalletSetAddress);
      expect(data.error).toBe(undefined);
      expect(data.ethAddress).toBe(ETHEREUM_MOCK_ADDRESS);
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
        await callAction(
          deposit,
          [
            {
              amount: parseEther("1.0"),
              ethAddress: window.ethereum.selectedAddress,
              multisigAddress: MULTISIG_MOCK_ADDRESS,
              nodeAddress: NODE_MOCK_ADDRESS
            },
            web3Provider
          ],
          ActionType.WalletSetBalance
        );
        fail("Deposit should have never proceeded.");
      } catch (e) {
        const [{ data }] = e as StoreAction<WalletState>[];
        expect(data.error.message).toContain("because of");
      }
    });
    it("should dispatch WALLET_DEPOSIT_CHECK_WALLET, WALLET_DEPOSIT_WAIT_FOR_FUNDS, WALLET_SET_BALANCE", async () => {
      const dispatchedActions = await callAction(
        deposit,
        [
          {
            amount: parseEther("1.0"),
            ethAddress: window.ethereum.selectedAddress,
            multisigAddress: MULTISIG_MOCK_ADDRESS,
            nodeAddress: NODE_MOCK_ADDRESS
          },
          web3Provider
        ],
        ActionType.WalletSetBalance
      );

      expect(dispatchedActions).toEqual([
        { type: WalletDepositTransition.CheckWallet },
        { type: WalletDepositTransition.WaitForFunds },
        {
          data: {
            ethereumBalance: One,
            counterfactualBalance: parseEther("1.0")
          },
          type: ActionType.WalletSetBalance
        }
      ]);
    });
    it("should should redirect to /channels if the History object is provided", async () => {
      const history = createMemoryHistory();

      expect(history.length).toBe(1);
      expect(history.location.pathname).toBe(RoutePath.Root);

      await callAction(
        deposit,
        [
          {
            amount: parseEther("1.0"),
            ethAddress: window.ethereum.selectedAddress,
            multisigAddress: MULTISIG_MOCK_ADDRESS,
            nodeAddress: NODE_MOCK_ADDRESS
          },
          web3Provider,
          history
        ],
        ActionType.WalletSetBalance
      );

      expect(history.length).toBe(2);
      expect(history.location.pathname).toBe(RoutePath.Channels);
    });
  });
});
