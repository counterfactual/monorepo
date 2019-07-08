import { defaultAbiCoder, keccak256 } from "ethers/utils";

/**
 * Computes a unique identifier for a StateChannel that is used to store a
 * virtual app instance.
 *
 * Note that despite the name, currently these channels simply contain virtual
 * app target instances and do not support full functionality that might be
 * expected of a state channel such as the ability to convert it to a direct
 * channel, or to install apps without the intermediary's involvement. For
 * this reason we are very explicit that this is "the unique identifier for the
 * `StateChannel` that wraps virtual apps". Perhaps there could be a name associated
 * with this particular `StateChannel` such as "virtualAppChannel" in the future, but
 * for now this is as specific as it gets.
 *
 * Finally, note that despite the fact we use `keccak256` and the RLP encoder, this
 * function does not actually matter for the context of any EVM execution, we are just
 * re-using these ethers functions as they conveniently can take the input data and produce
 * a 32-byte string.
 *
 * @export
 * @param {string[]} usersXpubs - The xpub identifiers of the virtual app participants
 * @param {string} intermediary - The xpub identifier of the intermediary
 *
 * @returns - A bytes32 string that can be used to unqiuely identify this StateChannel
 */
export function computeUniqueIdentifierForStateChannelThatWrapsVirtualApp(
  usersXpubs: string[],
  intermediary: string
) {
  if (usersXpubs.length !== 2) {
    throw Error(
      "computeUniqueIdentifierForStateChannelThatWrapsVirtualApp can only calculate with 2 users"
    );
  }

  usersXpubs.sort();

  return keccak256(
    defaultAbiCoder.encode(
      ["string", "string", "string"],
      [intermediary, usersXpubs[0], usersXpubs[1]]
    )
  );
}
