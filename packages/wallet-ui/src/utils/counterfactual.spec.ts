import { formatEther } from "ethers/utils";
import { JsonRPCResponse } from "web3/providers";
import EthereumMock, {
  disableEthereumMockBehavior,
  enableEthereumMockBehavior,
  FREE_BALANCE_MOCK_ADDRESS,
  HDNODE_MOCK,
  MULTISIG_MOCK_ADDRESS,
  NODE_MOCK_ADDRESS
} from "../store/test-utils/ethereum.mock";
import { BalanceRequest, Deposit } from "../store/types";
import { USER_MOCK_BALANCE, USER_MOCK_DATA } from "../store/user/user.mock";
import { CounterfactualEvent, CounterfactualMethod } from "../types";
import {
  buildRegistrationSignaturePayload,
  buildSignatureMessageForLogin,
  forFunds,
  forMultisig,
  getChannel,
  getChannelAddresses,
  getNodeAddress,
  getUserFromStoredToken,
  requestDeposit,
  storeTokenFromUser,
  xkeyKthAddress,
  xkeyKthHDNode
} from "./counterfactual";

describe("Utils > Counterfactual", () => {
  let send: jest.SpyInstance<
    Promise<JsonRPCResponse>,
    [CounterfactualMethod | CounterfactualEvent, (any[] | undefined)?]
  >;

  beforeEach(() => {
    window.ethereum = new EthereumMock();
    send = jest.spyOn(window.ethereum, "send");
  });

  describe("xkeyKthAddress()", () => {
    it("should return a public key from an xpub identifier", () => {
      expect(xkeyKthAddress(NODE_MOCK_ADDRESS, 0)).toEqual(
        FREE_BALANCE_MOCK_ADDRESS
      );
    });
  });

  describe("xkeyKthHDNode()", () => {
    it("should return an HDNode from an xpub identifier", () => {
      expect(xkeyKthHDNode(NODE_MOCK_ADDRESS, 0)).toEqual(HDNODE_MOCK);
    });
  });

  describe("getNodeAddress()", () => {
    it("should send the counterfactual:get:nodeAddress RPC", async () => {
      await getNodeAddress();

      expect(send).toBeCalledTimes(1);
      expect(send).toHaveBeenNthCalledWith(
        1,
        CounterfactualMethod.GetNodeAddress
      );
    });
  });

  describe("getUserFromStoredToken()", () => {
    it("should send the counterfactual:request:user RPC", async () => {
      await getUserFromStoredToken();

      expect(send).toBeCalledTimes(1);
      expect(send).toHaveBeenNthCalledWith(1, CounterfactualMethod.RequestUser);
    });
    it("should return the user or an empty object accordingly", async () => {
      const user = await getUserFromStoredToken();

      expect(user).toEqual({
        balance: formatEther(USER_MOCK_BALANCE),
        user: USER_MOCK_DATA
      });

      enableEthereumMockBehavior("returnEmptyUserOnRequestUser");

      const emptyUser = await getUserFromStoredToken();

      expect(emptyUser).toEqual({});
    });
  });

  describe("storeTokenFromUser()", () => {
    it("should send the counterfactual:set:user RPC", async () => {
      await storeTokenFromUser(USER_MOCK_DATA);

      expect(send).toBeCalledTimes(1);
      expect(send).toHaveBeenNthCalledWith(1, CounterfactualMethod.SetUser, [
        USER_MOCK_DATA.token
      ]);
    });
  });

  describe("buildRegistrationSignaturePayload()", () => {
    it("should create a signature payload", () => {
      const signature = buildRegistrationSignaturePayload(USER_MOCK_DATA);

      expect(signature).toEqual(
        [
          "PLAYGROUND ACCOUNT REGISTRATION",
          `Username: ${USER_MOCK_DATA.username}`,
          `E-mail: ${USER_MOCK_DATA.email}`,
          `Ethereum address: ${USER_MOCK_DATA.ethAddress}`,
          `Node address: ${USER_MOCK_DATA.nodeAddress}`
        ].join("\n")
      );
    });
  });

  describe("buildSignatureMessageForLogin()", () => {
    it("should create a signature payload", () => {
      const signature = buildSignatureMessageForLogin(
        USER_MOCK_DATA.ethAddress
      );

      expect(signature).toEqual(
        [
          "PLAYGROUND ACCOUNT LOGIN",
          `Ethereum address: ${USER_MOCK_DATA.ethAddress}`
        ].join("\n")
      );
    });
  });

  describe("forMultisig()", () => {
    it("should send the counterfactual:listen:createChannel RPC", async () => {
      await forMultisig();

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenNthCalledWith(
        1,
        CounterfactualEvent.CreateChannel
      );
    });
    it("should return a multisig address once the RPC resolves", async () => {
      expect(await forMultisig()).toEqual(MULTISIG_MOCK_ADDRESS);
    });
  });

  describe("requestDeposit()", () => {
    it("should send the counterfactual:request:deposit RPC", async () => {
      await requestDeposit({
        amount: USER_MOCK_BALANCE,
        multisigAddress: MULTISIG_MOCK_ADDRESS
      } as Deposit);

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenNthCalledWith(
        1,
        CounterfactualMethod.RequestDeposit,
        [USER_MOCK_BALANCE, MULTISIG_MOCK_ADDRESS]
      );
    });
  });

  describe("forFunds()", () => {
    it("should send the counterfactual:request:balances RPC", async () => {
      await forFunds({
        multisigAddress: MULTISIG_MOCK_ADDRESS,
        nodeAddress: NODE_MOCK_ADDRESS
      } as BalanceRequest);

      expect(send).toBeCalledTimes(1);
      expect(send).toHaveBeenNthCalledWith(
        1,
        CounterfactualMethod.RequestBalances,
        [MULTISIG_MOCK_ADDRESS]
      );
    });
    it("should retry if the counterdeposit is not complete", async done => {
      enableEthereumMockBehavior("forceRetryOnWaitForFunds");

      forFunds({
        multisigAddress: MULTISIG_MOCK_ADDRESS,
        nodeAddress: NODE_MOCK_ADDRESS
      } as BalanceRequest);

      setTimeout(() => {
        disableEthereumMockBehavior("forceRetryOnWaitForFunds");

        expect(send).toBeCalledTimes(2);
        expect(send).toHaveBeenNthCalledWith(
          1,
          CounterfactualMethod.RequestBalances,
          [MULTISIG_MOCK_ADDRESS]
        );
        expect(send).toHaveBeenNthCalledWith(
          2,
          CounterfactualMethod.RequestBalances,
          [MULTISIG_MOCK_ADDRESS]
        );
        done();
      }, 1500);
    });
  });

  describe("getChannelAddresses()", () => {
    it("should send the counterfactual:request:channels RPC and return the current node's channels", async () => {
      const channels = await getChannelAddresses();

      expect(channels).toEqual([MULTISIG_MOCK_ADDRESS]);

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenNthCalledWith(
        1,
        CounterfactualMethod.RequestChannels
      );
    });
  });

  describe("getChannel()", () => {
    it("should send the counterfactual:request:channel RPC", async () => {
      await getChannel(MULTISIG_MOCK_ADDRESS);

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenNthCalledWith(
        1,
        CounterfactualMethod.RequestChannel,
        [MULTISIG_MOCK_ADDRESS]
      );
    });
  });
});
