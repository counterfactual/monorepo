import { defaultAbiCoder, keccak256 } from "ethers/utils";

/// This function computes the key for a channel that is used to store virtual
/// app target instances. The "key" is part of the firebase path and is used
/// to uniquely identify the channel.
/// Note that despite the name, currently these channels simply contain virtual
/// app target instances and do not support full functionality that might be
/// expected of a "virtual channel" such as the ability to convert it to a
/// ledger channel, or to install apps without the intermediary's involvement.
export function virtualChannelKey(users: string[], intermediary: string) {
  if (users.length !== 2) {
    throw Error("virtualChannelKey can only calculate with 2 users");
  }

  users.sort();

  return keccak256(
    defaultAbiCoder.encode(
      ["string", "string", "string"],
      [intermediary, users[0], users[1]]
    )
  );
}
