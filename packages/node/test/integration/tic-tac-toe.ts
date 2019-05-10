import { SolidityABIEncoderV2Type } from "@counterfactual/types";

export const tttStateEncoding =
  "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)";

export const tttActionEncoding =
  "tuple(uint8 actionType, uint256 playX, uint256 playY, tuple(uint8 winClaimType, uint256 idx) winClaim)";

export const validAction = {
  actionType: 0,
  playX: 0,
  playY: 0,
  winClaim: {
    winClaimType: 0,
    idx: 0
  }
};

export function initialEmptyTTTState(
  playerAddresses: string[]
): SolidityABIEncoderV2Type {
  return {
    players: playerAddresses,
    turnNum: 0,
    winner: 0,
    board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  };
}
