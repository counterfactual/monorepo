import * as ethers from "ethers";

import { Address } from ".";

export class PeerBalance {
  /**
   * Returns an array of peer balance objects sorted by address ascendi.
   */
  public static balances(
    address1: Address,
    balance1: ethers.utils.BigNumber,
    address2: Address,
    balance2: ethers.utils.BigNumber
  ): CanonicalPeerBalance {
    if (address2.localeCompare(address1) < 0) {
      return new CanonicalPeerBalance(
        new PeerBalance(address2, balance2),
        new PeerBalance(address1, balance1)
      );
    }
    return new CanonicalPeerBalance(
      new PeerBalance(address1, balance1),
      new PeerBalance(address2, balance2)
    );
  }

  public static add(bals: PeerBalance[], inc: PeerBalance[]): PeerBalance[] {
    return [
      new PeerBalance(bals[0].address, bals[0].balance.add(inc[0].balance)),
      new PeerBalance(bals[1].address, bals[1].balance.add(inc[1].balance))
    ];
  }

  /**
   * @assume each array is of length 2.
   */
  public static subtract(
    oldBals: PeerBalance[],
    newBals: PeerBalance[]
  ): PeerBalance[] {
    if (oldBals[0].address === newBals[0].address) {
      return [
        new PeerBalance(
          oldBals[0].address,
          oldBals[0].balance.sub(newBals[0].balance)
        ),
        new PeerBalance(
          oldBals[1].address,
          oldBals[1].balance.sub(newBals[1].balance)
        )
      ];
    }
    return [
      new PeerBalance(
        oldBals[0].address,
        oldBals[0].balance.sub(newBals[1].balance)
      ),
      new PeerBalance(
        oldBals[1].address,
        oldBals[1].balance.sub(newBals[0].balance)
      )
    ];
  }
  public balance: ethers.utils.BigNumber;

  constructor(
    readonly address: Address,
    balance: number | ethers.utils.BigNumber
  ) {
    this.balance = ethers.utils.bigNumberify(balance.toString());
  }
}

/**
 * peerA is always the address first in alphabetical order.
 */
export class CanonicalPeerBalance {
  public static canonicalize(
    peer1: PeerBalance,
    peer2: PeerBalance
  ): CanonicalPeerBalance {
    if (peer2.address.localeCompare(peer1.address) < 0) {
      return new CanonicalPeerBalance(peer2, peer1);
    }
    return new CanonicalPeerBalance(peer1, peer2);
  }

  constructor(readonly peerA: PeerBalance, readonly peerB: PeerBalance) {}
}
