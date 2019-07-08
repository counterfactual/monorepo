import { SolidityABIEncoderV2Type } from "@counterfactual/types";
import { AddressZero, MaxUint256, Zero } from "ethers/constants";
import { BigNumber, bigNumberify } from "ethers/utils";

import { getCoinBucketAppInterface } from "../ethereum/utils/funds-bucket";
import { xkeysToSortedKthAddresses } from "../machine";

import { AppInstance } from ".";
import { HARD_CODED_ASSUMPTIONS } from "./state-channel";

export interface PartyBalanceMap {
  [to: string]: BigNumber;
}

export interface PartyBalance {
  to: string;
  amount: BigNumber;
}

export interface HexPartyBalance {
  to: string;
  amount: {
    _hex: string;
  };
}

export interface FreeBalanceState {
  [tokenAddress: string]: PartyBalance[];
}

export interface HexFreeBalanceState {
  tokens: string[];
  balances: HexPartyBalance[][];
}

/**
 * Note that the state of the Free Balance is held as plain types
 * and only converted to more complex types (i.e. BigNumber) upon usage.
 */
export function createFreeBalance(
  multisigAddress: string,
  userNeuteredExtendedKeys: string[],
  coinBucketAddress: string,
  freeBalanceTimeout: number
) {
  const sortedTopLevelKeys = xkeysToSortedKthAddresses(
    userNeuteredExtendedKeys,
    0 // NOTE: We re-use 0 which is also used as the keys for `multisigOwners`
  );

  // Making these values constants to be extremely explicit about
  // the built-in assumption here.
  const beneficiaryForPerson1 = sortedTopLevelKeys[0];
  const beneficiaryForPerson2 = sortedTopLevelKeys[1];

  const state: FreeBalanceState = {};
  const ethBalances: PartyBalance[] = [];
  for (const beneficiary of [beneficiaryForPerson1, beneficiaryForPerson2]) {
    ethBalances.push({
      to: beneficiary,
      amount: Zero
    });
  }
  state[AddressZero] = ethBalances;

  return new AppInstance(
    multisigAddress,
    sortedTopLevelKeys,
    freeBalanceTimeout,
    getCoinBucketAppInterface(coinBucketAddress),
    false,
    HARD_CODED_ASSUMPTIONS.appSequenceNumberForFreeBalance,
    convertFreeBalanceStateToSerializableObject(state),
    0,
    HARD_CODED_ASSUMPTIONS.freeBalanceInitialStateTimeout,
    undefined,
    // FIXME: refactor how the interpreter parameters get plumbed through
    { limit: MaxUint256 }
  );
}

export function convertPartyBalancesToMap(
  partyBalances: PartyBalance[]
): PartyBalanceMap {
  const balances = {};
  for (const balance of partyBalances) {
    balances[balance.to] = balance.amount;
  }
  return balances;
}

export function convertPartyBalancesFromMap(
  partyBalancesMap: PartyBalanceMap
): PartyBalance[] {
  const balances: PartyBalance[] = [];
  for (const addr of Object.keys(partyBalancesMap)) {
    balances.push({
      to: addr,
      amount: partyBalancesMap[addr]
    });
  }
  return balances;
}

export function convertFreeBalanceStateFromSerializableObject(
  plainFreeBalanceState: HexFreeBalanceState
): FreeBalanceState {
  const state: FreeBalanceState = {};
  for (
    let tokenIndex = 0;
    tokenIndex < plainFreeBalanceState.tokens.length;
    tokenIndex += 1
  ) {
    const tokenAddress = plainFreeBalanceState.tokens[tokenIndex];
    const balances = plainFreeBalanceState.balances[tokenIndex].map(
      plainCoinBucket => {
        return {
          to: plainCoinBucket.to,
          amount: bigNumberify(plainCoinBucket.amount._hex)
        };
      }
    );
    state[tokenAddress] = balances;
  }

  return state;
}

export function convertFreeBalanceStateToSerializableObject(
  freeBalanceState: FreeBalanceState
): SolidityABIEncoderV2Type {
  const state: HexFreeBalanceState = {
    tokens: [],
    balances: []
  };

  for (const tokenAddress of Object.keys(freeBalanceState)) {
    state["tokens"].push(tokenAddress);
    const balances = freeBalanceState[tokenAddress].map(coinBucket => {
      return {
        to: coinBucket.to,
        amount: {
          _hex: coinBucket.amount.toHexString()
        }
      };
    });
    state["balances"].push(balances);
  }

  return (state as unknown) as SolidityABIEncoderV2Type;
}

export function getETHBalancesFromFreeBalanceAppInstance(
  fb: AppInstance
): PartyBalanceMap {
  return convertPartyBalancesToMap(
    convertFreeBalanceStateFromSerializableObject(
      (fb.state as unknown) as HexFreeBalanceState
    )[AddressZero]
  );
}
