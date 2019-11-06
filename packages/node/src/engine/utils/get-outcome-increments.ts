import {
  CoinBalanceRefundState,
  multiAssetMultiPartyCoinTransferEncoding,
  MultiAssetMultiPartyCoinTransferInterpreterParams,
  OutcomeType,
  SingleAssetTwoPartyCoinTransferInterpreterParams,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams
} from "@counterfactual/types";
import { Provider } from "ethers/providers";
import { BigNumber, bigNumberify, defaultAbiCoder } from "ethers/utils";

import { AppInstance } from "../../models";
import {
  CoinTransfer,
  convertCoinTransfersToCoinTransfersMap,
  TokenIndexedCoinTransferMap
} from "../../models/free-balance";
import { wait } from "../../utils";

/**
 * Get the outcome of the app instance given, decode it according
 * to the outcome type stored in the app instance model, and return
 * a value uniformly across outcome type and whether the app is virtual
 * or direct. This return value must not contain the intermediary.
 */
export async function computeTokenIndexedFreeBalanceIncrements(
  appInstance: AppInstance,
  provider: Provider,
  encodedOutcomeOverride: string = ""
): Promise<TokenIndexedCoinTransferMap> {
  const { outcomeType } = appInstance;

  const encodedOutcome =
    encodedOutcomeOverride ||
    (await appInstance.computeOutcomeWithCurrentState(provider));

  // FIXME: This is a very sketchy way of handling this edge-case
  if (appInstance.state["threshold"] !== undefined) {
    return handleRefundAppOutcomeSpecialCase(
      encodedOutcome,
      appInstance,
      provider
    );
  }

  switch (outcomeType) {
    case OutcomeType.TWO_PARTY_FIXED_OUTCOME: {
      return handleTwoPartyFixedOutcome(
        encodedOutcome,
        appInstance.twoPartyOutcomeInterpreterParams
      );
    }
    case OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER: {
      return handleSingleAssetTwoPartyCoinTransfer(
        encodedOutcome,
        appInstance.singleAssetTwoPartyCoinTransferInterpreterParams
      );
    }
    case OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER: {
      return handleMultiAssetMultiPartyCoinTransfer(
        encodedOutcome,
        appInstance.multiAssetMultiPartyCoinTransferInterpreterParams
      );
    }
    default: {
      throw Error(
        "computeTokenIndexedFreeBalanceIncrements received an AppInstance with unknown OutcomeType"
      );
    }
  }
}

/**
 * This is in a special situation because it is
 * a `view` function. Since we do not have any encapsulation of a
 * getter for blockchain-based data, we naively re-query our only
 * hook to the chain (i.e., the `provider` variable) several times
 * until, at least one time out of 10, the values we see on chain
 * indicate a nonzero free balance increment.
 */
// FIXME:
// https://github.com/counterfactual/monorepo/issues/1371
async function handleRefundAppOutcomeSpecialCase(
  encodedOutcome: string,
  appInstance: AppInstance,
  provider: Provider
): Promise<TokenIndexedCoinTransferMap> {
  let mutableOutcome = encodedOutcome;
  let attempts = 1;
  while (attempts <= 10) {
    const [{ to, amount }] = decodeRefundAppState(mutableOutcome);

    if (amount.gt(0)) {
      return {
        [(appInstance.state as CoinBalanceRefundState).tokenAddress]: {
          [to]: amount
        }
      };
    }

    attempts += 1;

    await wait(1000 * attempts);

    // Note this statement queries the blockchain each time and
    // is the main reason for this 10-iteration while block.
    mutableOutcome = await appInstance.computeOutcomeWithCurrentState(provider);
  }

  throw Error(
    "When attempting to check for a deposit having been made to the multisig, did not find any non-zero deposits."
  );
}

function handleTwoPartyFixedOutcome(
  encodedOutcome: string,
  interpreterParams: TwoPartyFixedOutcomeInterpreterParams
): TokenIndexedCoinTransferMap {
  const { amount, playerAddrs, tokenAddress } = interpreterParams;

  switch (decodeTwoPartyFixedOutcome(encodedOutcome)) {
    case TwoPartyFixedOutcome.SEND_TO_ADDR_ONE:
      return {
        [tokenAddress]: {
          [playerAddrs[0]]: bigNumberify(amount)
        }
      };
    case TwoPartyFixedOutcome.SEND_TO_ADDR_TWO:
      return {
        [tokenAddress]: {
          [playerAddrs[1]]: bigNumberify(amount)
        }
      };
    case TwoPartyFixedOutcome.SPLIT_AND_SEND_TO_BOTH_ADDRS:
    default:
      return {
        [tokenAddress]: {
          [playerAddrs[0]]: bigNumberify(amount).div(2),
          [playerAddrs[1]]: bigNumberify(amount).sub(
            bigNumberify(amount).div(2)
          )
        }
      };
  }
}

function handleMultiAssetMultiPartyCoinTransfer(
  encodedOutcome: string,
  interpreterParams: MultiAssetMultiPartyCoinTransferInterpreterParams
): TokenIndexedCoinTransferMap {
  const decodedTransfers = decodeMultiAssetMultiPartyCoinTransfer(
    encodedOutcome
  );

  return interpreterParams.tokenAddresses.reduce(
    (acc, tokenAddress, index) => ({
      ...acc,
      [tokenAddress]: convertCoinTransfersToCoinTransfersMap(
        decodedTransfers[index]
      )
    }),
    {}
  );
}

function handleSingleAssetTwoPartyCoinTransfer(
  encodedOutcome: string,
  interpreterParams: SingleAssetTwoPartyCoinTransferInterpreterParams
): TokenIndexedCoinTransferMap {
  const { tokenAddress } = interpreterParams;

  const [
    { to: to1, amount: amount1 },
    { to: to2, amount: amount2 }
  ] = decodeSingleAssetTwoPartyCoinTransfer(encodedOutcome);

  return {
    [tokenAddress]: {
      [to1 as string]: amount1 as BigNumber,
      [to2 as string]: amount2 as BigNumber
    }
  };
}

function decodeRefundAppState(encodedOutcome: string): [CoinTransfer] {
  const [[{ to, amount }]] = defaultAbiCoder.decode(
    ["tuple(address to, uint256 amount)[2]"],
    encodedOutcome
  );

  return [{ to, amount }];
}

function decodeTwoPartyFixedOutcome(
  encodedOutcome: string
): TwoPartyFixedOutcome {
  const [twoPartyFixedOutcome] = defaultAbiCoder.decode(
    ["uint256"],
    encodedOutcome
  ) as [BigNumber];

  return twoPartyFixedOutcome.toNumber();
}

function decodeSingleAssetTwoPartyCoinTransfer(
  encodedOutcome: string
): [CoinTransfer, CoinTransfer] {
  const [[[to1, amount1], [to2, amount2]]] = defaultAbiCoder.decode(
    ["tuple(address to, uint256 amount)[2]"],
    encodedOutcome
  );

  return [{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }];
}

function decodeMultiAssetMultiPartyCoinTransfer(
  encodedOutcome: string
): CoinTransfer[][] {
  const [coinTransferListOfLists] = defaultAbiCoder.decode(
    [multiAssetMultiPartyCoinTransferEncoding],
    encodedOutcome
  );

  return coinTransferListOfLists.map(coinTransferList =>
    coinTransferList.map(({ to, amount }) => ({ to, amount }))
  );
}
