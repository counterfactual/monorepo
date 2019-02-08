import { StateChannel } from "../..";
import { xkeyKthAddress } from "../../xkeys";

/**
 * Gets a StateChannel from a map of them based on the counterparties
 *
 * @param stateChannelsMap A map of multisig address to StateChannel
 * @param me My address
 * @param counterparty The address of the counterparty
 * @todo Support StateChannel with more than 2 owners
 */
export function getChannelFromCounterparty(
  stateChannelsMap: Map<string, StateChannel>,
  me: string,
  counterparty: string
): StateChannel | undefined {
  const myMultisigAddress = xkeyKthAddress(me, 0);
  const theirMultisigAddress = xkeyKthAddress(counterparty, 0);
  return [...stateChannelsMap.values()].find(
    sc =>
      sc.multisigOwners.filter(owner => owner !== myMultisigAddress)[0] ===
      theirMultisigAddress
  );
}
