import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import {
  CoinBalanceRefundState,
  NetworkContext,
  OutcomeType,
  TwoPartyFixedOutcome
} from "@counterfactual/types";
import { Contract } from "ethers";
import { Zero } from "ethers/constants";
import { BaseProvider } from "ethers/providers";
import { defaultAbiCoder } from "ethers/utils";

import { AppInstance } from "../../models";
import {
  CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  TokenIndexedCoinTransferMap
} from "../../models/free-balance";

/**
 * Note that this is only used with `CoinBalanceRefundApp.sol`
 */
function computeCoinTransferIncrement(
  token: string,
  outcome: string
): TokenIndexedCoinTransferMap {
  const [decoded] = defaultAbiCoder.decode(
    ["tuple(address to, uint256 amount)[1][1]"],
    outcome
  );

  const ret: TokenIndexedCoinTransferMap = {};

  ret[token] = {};
  const balances = decoded[0];

  for (const pair of balances) {
    const [address, amount] = pair;
    ret[token][address] = amount;
  }
  return ret;
}

function anyNonzeroValues(map: TokenIndexedCoinTransferMap): Boolean {
  for (const tokenAddress of Object.keys(map)) {
    for (const address of Object.keys(map[tokenAddress])) {
      if (map[tokenAddress][address].gt(Zero)) {
        return true;
      }
    }
  }
  return false;
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// todo(xuanji): rename appInstanceId to identityHash
/**
 * Get the outcome of the app instance given, decode it according
 * to the outcome type stored in the app instance model, and return
 * a value uniformly across outcome type and whether the app is virtual
 * or direct. This return value must not contain the intermediary.
 */
export async function computeTokenIndexedFreeBalanceIncrements(
  networkContext: NetworkContext,
  appInstance: AppInstance,
  provider: BaseProvider
): Promise<TokenIndexedCoinTransferMap> {
  const appDefinition = new Contract(
    appInstance.appInterface.addr,
    CounterfactualApp.abi,
    provider
  );

  let outcome = await appDefinition.functions.computeOutcome(
    appInstance.encodedLatestState
  );

  const outcomeType = appInstance.toJson().outcomeType;

  if (outcomeType === undefined) {
    throw new Error("undefined outcomeType in appInstance");
  }

  switch (outcomeType) {
    case OutcomeType.REFUND_OUTCOME_TYPE: {
      // FIXME:
      // https://github.com/counterfactual/monorepo/issues/1371

      let attempts = 1;

      // todo(xuanji): factor out retryUntil function

      while (1) {
        outcome = await appDefinition.functions.computeOutcome(
          appInstance.encodedLatestState
        );

        const increments = computeCoinTransferIncrement(
          (appInstance.state as CoinBalanceRefundState).tokenAddress,
          outcome
        );

        if (anyNonzeroValues(increments)) {
          return increments;
        }

        attempts += 1;

        if (attempts === 10) {
          throw new Error("Failed to get a outcome after 10 attempts");
        }

        await wait(1000 * attempts);
      }
    }
    case OutcomeType.TWO_PARTY_FIXED_OUTCOME: {
      const [decoded] = defaultAbiCoder.decode(["uint256"], outcome);

      if (appInstance.twoPartyOutcomeInterpreterParams === undefined) {
        throw new Error(
          "app instance outcome type set to two party outcome, but twoPartyOutcomeInterpreterParams not defined"
        );
      }

      const total = appInstance.twoPartyOutcomeInterpreterParams!.amount;

      if (decoded.eq(TwoPartyFixedOutcome.SEND_TO_ADDR_ONE)) {
        return {
          [CONVENTION_FOR_ETH_TOKEN_ADDRESS]: {
            [appInstance.twoPartyOutcomeInterpreterParams!
              .playerAddrs[0]]: total
          }
        };
      }

      if (decoded.eq(TwoPartyFixedOutcome.SEND_TO_ADDR_TWO)) {
        return {
          [CONVENTION_FOR_ETH_TOKEN_ADDRESS]: {
            [appInstance.twoPartyOutcomeInterpreterParams!
              .playerAddrs[1]]: total
          }
        };
      }

      const i0 = total.div(2);
      const i1 = total.sub(i0);

      return {
        [CONVENTION_FOR_ETH_TOKEN_ADDRESS]: {
          [appInstance.twoPartyOutcomeInterpreterParams!.playerAddrs[0]]: i0,
          [appInstance.twoPartyOutcomeInterpreterParams!.playerAddrs[1]]: i1
        }
      };
    }
    default: {
      throw Error("unknown interpreter");
    }
  }
}
