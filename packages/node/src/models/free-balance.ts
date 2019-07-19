import { OutcomeType } from "@counterfactual/types";
import { AddressZero, MaxUint256, Zero } from "ethers/constants";
import { BigNumber, bigNumberify } from "ethers/utils";

import { getFreeBalanceAppInterface } from "../ethereum/utils/free-balance-app";
import { xkeysToSortedKthAddresses } from "../machine/xkeys";

import { AppInstance } from "./app-instance";

const HARD_CODED_ASSUMPTIONS = {
  freeBalanceInitialStateTimeout: 172800,
  // We assume the Free Balance is the first app ever installed
  appSequenceNumberForFreeBalance: 0
};

/**
 * We use 0x00...000 to represent an identifier for the ETH token
 * in places where values are indexed on token address. Of course,
 * in practice, there is no "token address" for ETH because it is a
 * native asset on the ethereum blockchain, but using this as an index
 * is convenient for storing this data in the same data structure that
 * also carries data about ERC20 tokens.
 */
export const CONVENTION_FOR_ETH_TOKEN_ADDRESS = AddressZero;

export type CoinTransferMap = {
  [to: string]: BigNumber;
};

export type TokenIndexedCoinTransferMap = {
  [tokenAddress: string]: CoinTransferMap;
};

export type CoinTransfer = {
  to: string;
  amount: BigNumber;
};

export type CoinTransferJSON = {
  to: string;
  amount: {
    _hex: string;
  };
};

export type ActiveAppsMap = { [appInstanceIdentityHash: string]: true };

export type FreeBalanceState = {
  activeAppsMap: ActiveAppsMap;
  balancesIndexedByToken: { [tokenAddress: string]: CoinTransfer[] };
};

export type FreeBalanceStateJSON = {
  tokens: string[];
  balances: CoinTransferJSON[][];
  activeApps: string[];
};

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

  const initialState: FreeBalanceState = {
    activeAppsMap: {},
    balancesIndexedByToken: {
      // NOTE: Extremely important to understand that the default
      // addresses of the recipients are the "top level keys" as defined
      // as the 0th derived children of the xpubs.
      [CONVENTION_FOR_ETH_TOKEN_ADDRESS]: [
        { to: sortedTopLevelKeys[0], amount: Zero },
        { to: sortedTopLevelKeys[1], amount: Zero }
      ]
    }
  };

  return new AppInstance(
    multisigAddress,
    sortedTopLevelKeys,
    freeBalanceTimeout,
    getFreeBalanceAppInterface(coinBucketAddress),
    false,
    HARD_CODED_ASSUMPTIONS.appSequenceNumberForFreeBalance,
    serializeFreeBalanceState(initialState),
    0,
    HARD_CODED_ASSUMPTIONS.freeBalanceInitialStateTimeout,
    OutcomeType.FREE_BALANCE_OUTCOME_TYPE,
    undefined,
    // FIXME: refactor how the interpreter parameters get plumbed through
    { limit: [MaxUint256], tokens: [CONVENTION_FOR_ETH_TOKEN_ADDRESS] }
  );
}

export function convertCoinTransfersToCoinTransfersMap(
  coinTransfers: CoinTransfer[]
): CoinTransferMap {
  return (coinTransfers || []).reduce(
    (acc, { to, amount }) => ({ ...acc, [to]: amount }),
    {}
  );
}

export function convertCoinTransfersMapToCoinTransfers(
  coinTransfersMap: CoinTransferMap
): CoinTransfer[] {
  return Object.entries(coinTransfersMap).map(([to, amount]) => ({
    to,
    amount
  }));
}

/**
 * Given an AppInstance whose state is FreeBalanceState, convert the state
 * into the locally more convenient data type CoinTransferMap and return that.
 *
 * Note that this function will also default the `to` addresses of a new token
 * to the 0th signing keys of the FreeBalanceApp AppInstance.
 *
 * @export
 * @param {AppInstance} freeBalance - an AppInstance that is a FreeBalanceApp
 *
 * @returns {CoinTransferMap} - HexFreeBalanceState indexed on tokens
 */
export function getBalancesFromFreeBalanceAppInstance(
  freeBalanceAppInstance: AppInstance,
  tokenAddress: string
): CoinTransferMap {
  const freeBalanceState = deserializeFreeBalanceState(
    freeBalanceAppInstance.state as FreeBalanceStateJSON
  );

  const coinTransfers = freeBalanceState.balancesIndexedByToken[
    tokenAddress
  ] || [
    { to: freeBalanceAppInstance.signingKeys[0], amount: Zero },
    { to: freeBalanceAppInstance.signingKeys[1], amount: Zero }
  ];

  return convertCoinTransfersToCoinTransfersMap(coinTransfers);
}

export function deserializeFreeBalanceState(
  freeBalanceStateJSON: FreeBalanceStateJSON
): FreeBalanceState {
  const { activeApps, tokens, balances } = freeBalanceStateJSON;
  return {
    balancesIndexedByToken: (tokens || []).reduce(
      (acc, token, idx) => ({
        ...acc,
        [token]: balances[idx].map(({ to, amount }) => ({
          to,
          amount: bigNumberify(amount._hex)
        }))
      }),
      {}
    ),
    activeAppsMap: (activeApps || []).reduce(
      (acc, identityHash) => ({ ...acc, [identityHash]: true }),
      {}
    )
  };
}

export function serializeFreeBalanceState(
  freeBalanceState: FreeBalanceState
): FreeBalanceStateJSON {
  return {
    activeApps: Object.keys(freeBalanceState.activeAppsMap),
    tokens: Object.keys(freeBalanceState.balancesIndexedByToken),
    balances: Object.values(freeBalanceState.balancesIndexedByToken).map(
      balances =>
        balances.map(({ to, amount }) => ({
          to,
          amount: {
            _hex: amount.toHexString()
          }
        }))
    )
  };
}
