import { StateChannel } from "../..";

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
  const expectedExtendedKeys = [me, counterparty].sort();
  return [...stateChannelsMap.values()].find(
    sc =>
      JSON.stringify(sc.userNeuteredExtendedKeys.concat().sort()) ===
      JSON.stringify(expectedExtendedKeys)
  );
}
