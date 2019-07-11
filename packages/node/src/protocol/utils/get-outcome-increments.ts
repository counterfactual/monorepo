import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import {
  NetworkContext,
  OutcomeType,
  TwoPartyFixedOutcome
} from "@counterfactual/types";
import { Contract } from "ethers";
import { Zero } from "ethers/constants";
import { BaseProvider } from "ethers/providers";
import { defaultAbiCoder } from "ethers/utils";

import { StateChannel } from "../../models";
import {
  CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  TokenIndexedBalanceMap
} from "../../models/free-balance";

/**
 * Note that this is only used with `CoinBalanceRefundApp.sol`
 */
function computeCoinTransferIncrement(
  tokens: string[],
  outcome
): TokenIndexedBalanceMap {
  const [decoded] = defaultAbiCoder.decode(
    ["tuple(address to, uint256 amount)[][]"],
    outcome
  );

  if ((decoded as []).length !== tokens.length) {
    throw new Error(
      "Mismatch between expected number of tokens and actual number of tokens incremented"
    );
  }

  const ret: TokenIndexedBalanceMap = {};

  // tslint:disable-next-line:prefer-array-literal
  for (const tokenIndex of Array(tokens.length)) {
    ret[tokens[tokenIndex]] = {};
    const balances = decoded[tokenIndex];

    for (const pair of balances) {
      const [address, amount] = pair;
      ret[tokens[tokenIndex]][address] = amount;
    }
  }
  return ret;
}

function anyNonzeroValues(map: TokenIndexedBalanceMap): Boolean {
  for (const tokenAddress of Object.keys(map)) {
    for (const address in Object.keys(map[tokenAddress])) {
      if (map[tokenAddress][address].gt(Zero)) {
        return true;
      }
    }
  }
  return false;
}

export async function computeTokenIndexedFreeBalanceIncrements(
  networkContext: NetworkContext,
  stateChannel: StateChannel,
  appInstanceId: string,
  provider: BaseProvider
): Promise<TokenIndexedBalanceMap> {
  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const appDefinition = new Contract(
    appInstance.appInterface.addr,
    CounterfactualApp.abi,
    provider
  );

  let outcome = await appDefinition.functions.computeOutcome(
    appInstance.encodedLatestState
  );

  // Temporary, better solution is to add outcomeType to AppInstance model
  let outcomeType: OutcomeType | undefined;
  if (typeof appInstance.coinTransferInterpreterParams !== "undefined") {
    outcomeType = OutcomeType.COIN_TRANSFER;
  } else if (
    typeof appInstance.twoPartyOutcomeInterpreterParams !== "undefined"
  ) {
    outcomeType = OutcomeType.TWO_PARTY_FIXED_OUTCOME;
  }

  switch (outcomeType) {
    case OutcomeType.COIN_TRANSFER: {
      // FIXME:
      // https://github.com/counterfactual/monorepo/issues/1371

      let attempts = 1;

      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
      while (1) {
        outcome = await appDefinition.functions.computeOutcome(
          appInstance.encodedLatestState
        );

        const increments = computeCoinTransferIncrement(
          appInstance.coinTransferInterpreterParams!.tokens,
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
