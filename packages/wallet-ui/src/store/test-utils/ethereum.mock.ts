import { Zero } from "ethers/constants";
import { formatEther, parseEther } from "ethers/utils";
import { JsonRPCResponse } from "web3/providers";
import {
  CounterfactualEvent,
  CounterfactualMethod,
  EthereumGlobal
} from "../../types";
import { USER_MOCK_BALANCE, USER_MOCK_DATA } from "../user/user.mock";

export const ETHEREUM_MOCK_ADDRESS =
  "0x9aF5D0dcABc31B1d80639ac3042b2aD754f072FE";

export const MULTISIG_MOCK_ADDRESS =
  "0x54601F103dD6AE110aEf7F9007670f593d24a6ac";

export const NODE_MOCK_ADDRESS =
  "xpub6EAvo4pQADUK1nFB2UnC9nC5G9iDN3YaeVQ8vA77eU7GEjaZK8H5jDP8M89kJeajTqXJrfbKXgptCqtvpaG1ydED657Kj6dbfjYse6F7Uxy";

export const COUNTERPARTY_MOCK_ADDRESS =
  "xpub6E7Ww5YRUry7BRUNAqyNGqR1A3AyaRP1dKy8adD5N5nniqkDJpibhspkiLzyhKe9o5TFnHpEhdtautQLqxahWQFCDCeQdBFmRwUiChfUXP4";

export const FREE_BALANCE_MOCK_ADDRESS =
  "0xDe214c9409962811C8b7522a663710Bf334D6260";

export const COUNTERPARTY_FREE_BALANCE_MOCK_ADDRESS =
  "0xb6c0924Ca0C030AC64c037C3Af665aebb78cB109";

export const TRANSACTION_MOCK_HASH =
  "0xf86c258502540be40083035b609482e041e84074fc5f5947d4d27e3c44f824b7a1a187b1a2bc2ec500008078a04a7db627266fa9a4116e3f6b33f5d245db40983234eb356261f36808909d2848a0166fa098a2ce3bda87af6000ed0083e3bf7cc31c6686b670bd85cbc6da2d6e85";

export const ETHEREUM_MOCK_BALANCE = parseEther("2.0");

export const FREE_BALANCE_MOCK_AMOUNT = parseEther("1.0");

export const COUNTERFACTUAL_FREE_BALANCE_MOCK_AMOUNT = parseEther("1.0");

export const HDNODE_MOCK = {
  privateKey: null,
  publicKey:
    "0x03314a7e4890cacb7098ae6bc0f716a2818cba7354df7269a28ab92d4ffe0d8581",
  parentFingerprint: "0x77421f11",
  fingerprint: "0x388f1f6b",
  address: "0xDe214c9409962811C8b7522a663710Bf334D6260",
  chainCode:
    "0x55ce8411daaeeb61f047aa5714a4634e59090980ebb8ddd44cd0689a606356b9",
  index: 0,
  depth: 5,
  mnemonic: null,
  path: null
};

export type EthereumMockBehaviors = {
  failOnEnable: boolean;
  rejectDeposit: boolean;
  nodeAddressFromUserMock: boolean;
  multisigAddressFromUserMock: boolean;
  returnEmptyUserOnRequestUser: boolean;
  forceRetryOnWaitForFunds: boolean;
  forceFailOnGetAllChannels: boolean;
};

export const enableEthereumMockBehavior = (
  behaviorName: keyof EthereumMockBehaviors
) => {
  (window.ethereum as EthereumMock).mockBehaviors[behaviorName] = true;
};

export const disableEthereumMockBehavior = (
  behaviorName: keyof EthereumMockBehaviors
) => {
  (window.ethereum as EthereumMock).mockBehaviors[behaviorName] = false;
};

export default class EthereumMock implements EthereumGlobal {
  responseCallbacks: undefined;
  notificationCallbacks: undefined;
  connection: undefined;
  addDefaultEvents: undefined;

  networkVersion: string = "";
  selectedAddress: string = "";

  isMetaMask?: boolean = false;
  host?: string;
  path?: string;

  token?: string;

  mockBehaviors: EthereumMockBehaviors = {
    failOnEnable: false,
    rejectDeposit: false,
    nodeAddressFromUserMock: false,
    multisigAddressFromUserMock: false,
    returnEmptyUserOnRequestUser: false,
    forceRetryOnWaitForFunds: false,
    forceFailOnGetAllChannels: false
  };

  constructor(private readonly events: { [key: string]: Function[] } = {}) {}

  async enable() {
    if (this.mockBehaviors.failOnEnable) {
      throw new Error();
    }

    this.selectedAddress = ETHEREUM_MOCK_ADDRESS;
  }

  on(type: string, callback: () => any): undefined {
    this.events[type] = [...(this.events[type] || []), callback];
    return;
  }

  removeListener(type: string, callback: () => any): undefined {
    this.events[type] = (this.events[type] || []).filter(cb => cb === callback);
    return;
  }

  removeAllListeners(type: string): undefined {
    this.events[type] = [];
    return;
  }

  async send(
    eventOrMethod: CounterfactualMethod | CounterfactualEvent,
    data: any[] = []
  ): Promise<JsonRPCResponse> {
    if (eventOrMethod === CounterfactualMethod.RequestDeposit) {
      if (this.mockBehaviors.rejectDeposit) {
        throw new Error();
      }
    }

    if (
      eventOrMethod === CounterfactualMethod.RequestUser &&
      !this.mockBehaviors.returnEmptyUserOnRequestUser
    ) {
      return {
        jsonrpc: "2.0",
        result: {
          balance: formatEther(USER_MOCK_BALANCE),
          user: USER_MOCK_DATA
        },
        id: Date.now()
      };
    }

    if (eventOrMethod === CounterfactualMethod.RequestBalances) {
      return {
        jsonrpc: "2.0",
        result: {
          [FREE_BALANCE_MOCK_ADDRESS]: this.mockBehaviors
            .forceRetryOnWaitForFunds
            ? Zero
            : FREE_BALANCE_MOCK_AMOUNT,
          [COUNTERPARTY_FREE_BALANCE_MOCK_ADDRESS]: this.mockBehaviors
            .forceRetryOnWaitForFunds
            ? Zero
            : COUNTERFACTUAL_FREE_BALANCE_MOCK_AMOUNT
        },
        id: Date.now()
      };
    }

    if (
      eventOrMethod === CounterfactualMethod.RequestChannels &&
      !this.mockBehaviors.forceFailOnGetAllChannels
    ) {
      return {
        jsonrpc: "2.0",
        result: {
          multisigAddresses: [MULTISIG_MOCK_ADDRESS]
        },
        id: Date.now()
      };
    }

    if (eventOrMethod === CounterfactualMethod.GetNodeAddress) {
      return {
        jsonrpc: "2.0",
        result: this.mockBehaviors.nodeAddressFromUserMock
          ? USER_MOCK_DATA.nodeAddress
          : NODE_MOCK_ADDRESS,
        id: Date.now()
      };
    }

    if (eventOrMethod === CounterfactualMethod.SetUser) {
      this.token = data[0];
    }

    if (eventOrMethod === CounterfactualEvent.CreateChannel) {
      return {
        jsonrpc: "2.0",
        result: {
          data: {
            multisigAddress: this.mockBehaviors.nodeAddressFromUserMock
              ? USER_MOCK_DATA.multisigAddress
              : MULTISIG_MOCK_ADDRESS
          }
        },
        id: Date.now()
      };
    }

    return {
      jsonrpc: "2.0",
      result: {}
    } as JsonRPCResponse;
  }

  reset(): undefined {
    return;
  }
}
