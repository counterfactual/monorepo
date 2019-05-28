import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import { NetworkContext, OutcomeType } from "@counterfactual/types";
import { Contract } from "ethers";
import { One, Zero } from "ethers/constants";
import { BaseProvider } from "ethers/providers";
import { BigNumber, bigNumberify, defaultAbiCoder } from "ethers/utils";

import { StateChannel } from "../../models";

function computeEthTransferIncrement(outcome): [string, BigNumber] {
  const decoded = defaultAbiCoder.decode(["tuple(address,uint256)[]"], outcome);

  if (
    !(
      decoded.length === 1 &&
      decoded[0].length === 1 &&
      decoded[0][0].length === 2
    )
  ) {
    throw new Error("Outcome function returned unexpected shape");
  }
  const [[[address, to]]] = decoded;

  return [address, to];
}

export async function computeFreeBalanceIncrements(
  networkContext: NetworkContext,
  stateChannel: StateChannel,
  appInstanceId: string,
  provider: BaseProvider
): Promise<{ [x: string]: BigNumber }> {
  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const appDefinition = new Contract(
    appInstance.appInterface.addr,
    CounterfactualApp.abi,
    provider
  );

  let outcome = await appDefinition.functions.computeOutcome(
    appInstance.encodedLatestState
  );

  const outcomeType = bigNumberify(
    await appDefinition.functions.outcomeType()
  ).toNumber();

  switch (outcomeType) {
    case OutcomeType.ETH_TRANSFER: {
      // FIXME:
      // https://github.com/counterfactual/monorepo/issues/1371

      let attempts = 1;

      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
      while (1) {
        outcome = await appDefinition.functions.computeOutcome(
          appInstance.encodedLatestState
        );

        const [address, to] = computeEthTransferIncrement(outcome);

        if (to.gt(Zero)) {
          return { [address]: to };
        }

        attempts += 1;

        if (attempts === 10) {
          throw new Error("Failed to get a outcome after 10 attempts");
        }

        await wait(1000 * attempts);
      }
    }
    case OutcomeType.TWO_PARTY_OUTCOME: {
      const [decoded] = defaultAbiCoder.decode(["uint256"], outcome);

      const total = appInstance.limitOrTotal;
      if (decoded.eq(Zero)) {
        return {
          [appInstance.beneficiaries[0]]: total
        };
      }
      if (decoded.eq(One)) {
        return {
          [appInstance.beneficiaries[1]]: total
        };
      }

      const i0 = total.div(2);
      const i1 = total.sub(i0);
      return {
        [appInstance.beneficiaries[0]]: i0,
        [appInstance.beneficiaries[1]]: i1
      };
    }
    default: {
      throw Error("unknown interpreter");
    }
  }
}
