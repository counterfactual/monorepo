import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import { NetworkContext } from "@counterfactual/types";
import { Contract } from "ethers";
import { One, Zero } from "ethers/constants";
import { BaseProvider } from "ethers/providers";
import { BigNumber, bigNumberify, defaultAbiCoder } from "ethers/utils";

import { StateChannel } from "../../models";

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

  const resolution = await appDefinition.functions.resolve(
    appInstance.encodedLatestState
  );

  /// todo(xuanji)
  /// there used to be a bunch of retry logic here, to handle the case where
  /// the appDefinition contract was deployed recently (and hence the provider
  /// sometimes returning an incorrect definition). This TODO is to handle
  /// that situation.

  const resolveType = bigNumberify(await appDefinition.functions.resolveType());

  if (resolveType.eq(One)) {
    /* ETHInterpreter */

    const decoded = defaultAbiCoder.decode(
      ["tuple(address,uint256)[]"],
      resolution
    );

    if (
      !(
        decoded.length === 1 &&
        decoded[0].length === 1 &&
        decoded[0][0].length === 2
      )
    ) {
      throw new Error("Resolve function returned unexpected shape");
    }
    const [[[address, to]]] = decoded;

    return { [address]: to };
  }
  if (resolveType.eq(Zero)) {
    /* TWO_PARTY_OUTCOME */

    const [decoded] = defaultAbiCoder.decode(["uint256"], resolution);

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
  throw Error("unknown interpreter");
}
