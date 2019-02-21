import { takeTurn } from "../src/index";
import { ethers } from "ethers";

function bigNumberifyBoard(board) {
  return board.reduce((board, row) => {
    board.push(row.reduce((row, square) => {
      row.push(ethers.utils.bigNumberify(square));

      return row;
    }, []));

    return board;
  }, [])
}

describe("takeTurn", () => {
  const botPlayer = "abc";
  const players = ["123", botPlayer];

  it("adds a move to a random unoccupied square when a free square is available", () => {
    const newState = [
      players,
      4,
      0,
      bigNumberifyBoard([
        [0,1,0],
        [2,0,0],
        [1,0,0]
      ])
    ];
    const result = takeTurn(newState, botPlayer);

    expect(result.actionType).toBe(0);
    expect(result.board.flat().filter((val) => ethers.utils.bigNumberify(val).toString() === "1").length).toBe(2);
    expect(result.board.flat().filter((val) => ethers.utils.bigNumberify(val).toString() === "2").length).toBe(2);
  });

  it("throws an error if there are no moves to make", () => {
    const newState = [
      players,
      4,
      0,
      bigNumberifyBoard([
        [1,1,2],
        [2,2,1],
        [1,2,1]
      ])
    ];
    expect(() => takeTurn(newState, botPlayer)).toThrowError("Yikes! No place left to move.");
  });

  it("sets the actionType to 2 (aka a draw) when there is a single, non-winning move to make", () => {
    const newState = [
      players,
      4,
      0,
      bigNumberifyBoard([
        [1,1,0],
        [2,2,1],
        [1,2,1]
      ])
    ];
    const result = takeTurn(newState, botPlayer);
    
    expect(result.actionType).toBe(2);
    expect(result.board.flat().filter((val) => ethers.utils.bigNumberify(val).toString() === "1").length).toBe(5);
    expect(result.board.flat().filter((val) => ethers.utils.bigNumberify(val).toString() === "2").length).toBe(4);
  });

  it("sets the actionType to 1 (aka a victory) when it wins the game", () => {
    const newState = [
      players,
      4,
      0,
      bigNumberifyBoard([
        [1,1,0],
        [2,2,1],
        [2,1,1]
      ])
    ];
    const result = takeTurn(newState, botPlayer);
    
    expect(result.actionType).toBe(1);
    expect(result.board.flat().filter((val) => ethers.utils.bigNumberify(val).toString() === "1").length).toBe(5);
    expect(result.board.flat().filter((val) => ethers.utils.bigNumberify(val).toString() === "2").length).toBe(4);
  });
});