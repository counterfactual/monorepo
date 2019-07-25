import { bigNumberify } from "ethers/utils";

import { takeTurn } from "../src/bot";

function bigNumberifyBoard(board) {
  return board.reduce((board, row) => {
    board.push(
      row.reduce((row, square) => {
        row.push(bigNumberify(square));

        return row;
      }, [])
    );

    return board;
  }, []);
}

describe("takeTurn", () => {
  it("throws an error if there are no moves to make", () => {
    const board = bigNumberifyBoard([[1, 1, 2], [2, 2, 1], [1, 2, 1]]);
    expect(() => takeTurn(board, 2)).toThrowError(
      "Yikes! No place left to move."
    );
  });

  it("sets the actionType to 2 (aka a draw) when there is a single, non-winning move to make", () => {
    const board = bigNumberifyBoard([[1, 1, 0], [2, 2, 1], [1, 2, 1]]);
    const result = takeTurn(board, 2);

    expect(result.actionType).toBe(2);
    expect(result.winClaim).toEqual({ idx: 0, winClaimType: 0 });
    expect(result.playX).toBe(0);
    expect(result.playY).toBe(2);
  });

  it("sets the actionType to 1 (aka a victory) when it wins the game", () => {
    const board = bigNumberifyBoard([[1, 1, 0], [2, 2, 1], [2, 1, 1]]);
    const result = takeTurn(board, 2);

    expect(result.actionType).toBe(1);
    expect(result.winClaim).toEqual({ idx: 0, winClaimType: 3 });
    expect(result.playX).toBe(0);
    expect(result.playY).toBe(2);
  });
});
