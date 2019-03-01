import { Node } from "@counterfactual/node";
import { Address, Node as NodeTypes } from "@counterfactual/types";
import { ethers } from "ethers";
import { v4 } from "uuid";

const bn = ethers.utils.bigNumberify;
const ZERO = bn(0);

function checkDraw(board: Board) {
  return board.every((row: BoardRow) =>
    row.every((square: BoardSquare) => !bn(square).eq(ZERO))
  );
}

function checkVictory(board: Board, player: number) {
  return (
    checkHorizontalVictory(board, player) ||
    checkVerticalVictory(board, player) ||
    checkDiagonalVictory(board, player) ||
    checkCrossDiagonalVictory(board, player)
  );
}

function checkHorizontalVictory(board: Board, player: number) {
  let idx;
  const victory = board.some((row: BoardRow, index) => {
    idx = index;
    return row.every((square: BoardSquare) => bn(square).eq(bn(player)));
  });

  if (victory) {
    return {
      idx,
      winClaimType: 0
    };
  }
  return false;
}

function checkVerticalVictory(board: Board, player: number) {
  let idx;
  const victory = board[0].some((columnStart: BoardSquare, index) => {
    idx = index;
    return (
      bn(columnStart).eq(bn(player)) &&
      bn(board[1][index]).eq(bn(player)) &&
      bn(board[2][index]).eq(bn(player))
    );
  });

  if (victory) {
    return {
      idx,
      winClaimType: 1
    };
  }
  return false;
}

function checkDiagonalVictory(board: Board, player: number) {
  const victory =
    bn(board[0][0]).eq(bn(player)) &&
    bn(board[1][1]).eq(bn(player)) &&
    bn(board[2][2]).eq(bn(player));

  if (victory) {
    return {
      idx: 0,
      winClaimType: 2
    };
  }
  return false;
}

function checkCrossDiagonalVictory(board: Board, player: number) {
  const victory =
    bn(board[0][2]).eq(bn(player)) &&
    bn(board[1][1]).eq(bn(player)) &&
    bn(board[2][0]).eq(bn(player));

  if (victory) {
    return {
      idx: 0,
      winClaimType: 3
    };
  }
  return false;
}

function respond(
  node: Node,
  ethAddress: Address,
  { data: { appInstanceId, newState } }
) {
  const winner = ethers.utils.bigNumberify(newState[2]).toNumber();

  if (winner === 0) {
    const action = takeTurn(newState, ethAddress);
    const request = {
      params: {
        appInstanceId,
        action
      },
      requestId: v4(),
      type: NodeTypes.MethodName.TAKE_ACTION
    };

    node.call(request.type, request);
  }
}

export function takeTurn(newState: State, ethAddress: Address) {
  const [players, , , board] = newState;
  const botPlayerNumber = players.indexOf(ethAddress) + 1;
  const { playX, playY } = makeMove(board);
  board[playX][playY] = ethers.utils.bigNumberify(botPlayerNumber);
  const winClaim = checkVictory(board, botPlayerNumber);

  return {
    playX,
    playY,
    actionType: determineActionType(board, botPlayerNumber),
    winClaim: winClaim || { winClaimType: 0, idx: 0 }
  };
}

function makeMove(board: Board) {
  const possibleMoves: Coordinates[] = [];

  for (let x = 0; x < 3; x += 1) {
    for (let y = 0; y < 3; y += 1) {
      if (ethers.utils.bigNumberify(board[x][y]).toNumber() === 0) {
        possibleMoves.push({
          x,
          y
        } as Coordinates);
      }
    }
  }

  if (possibleMoves.length === 0) {
    throw new Error("Yikes! No place left to move.");
  }

  const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  const playX = move.x;
  const playY = move.y;

  return {
    playX,
    playY
  };
}

function determineActionType(board: Board, botPlayerNumber: number) {
  if (checkVictory(board, botPlayerNumber)) {
    return 1;
  }
  if (checkDraw(board)) {
    return 2;
  }
  return 0;
}

export async function connectNode(node: Node, ethAddress: Address) {
  node.on("proposeInstallVirtualEvent", async data => {
    const appInstanceId = data.data.appInstanceId;
    const intermediaries = data.data.params.intermediaries;

    const request = {
      type: NodeTypes.MethodName.INSTALL_VIRTUAL,
      params: {
        appInstanceId,
        intermediaries
      },
      requestId: v4()
    };

    await node.call(request.type, request);

    node.on("updateStateEvent", async updateEventData => {
      if (updateEventData.data.appInstanceId === appInstanceId) {
        respond(node, ethAddress, updateEventData);
      }
    });
  });
}

type Players = Address[];
type State = [Players, number, number, Board];
type BoardSquare = number | ethers.utils.BigNumber;
type BoardRow = BoardSquare[];
type Board = BoardRow[];

type Coordinates = {
  x: number;
  y: number;
};
