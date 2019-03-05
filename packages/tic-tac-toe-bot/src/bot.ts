import { Node } from "@counterfactual/node";
import { Address, Node as NodeTypes } from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { BigNumber, bigNumberify } from "ethers/utils";
import { v4 as generateUUID } from "uuid";

function checkDraw(board: Board) {
  return board.every((row: BoardRow) =>
    row.every((square: BoardSquare) => !bigNumberify(square).eq(Zero))
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
    return row.every((square: BoardSquare) =>
      bigNumberify(square).eq(bigNumberify(player))
    );
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
      bigNumberify(columnStart).eq(bigNumberify(player)) &&
      bigNumberify(board[1][index]).eq(bigNumberify(player)) &&
      bigNumberify(board[2][index]).eq(bigNumberify(player))
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
    bigNumberify(board[0][0]).eq(bigNumberify(player)) &&
    bigNumberify(board[1][1]).eq(bigNumberify(player)) &&
    bigNumberify(board[2][2]).eq(bigNumberify(player));

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
    bigNumberify(board[0][2]).eq(bigNumberify(player)) &&
    bigNumberify(board[1][1]).eq(bigNumberify(player)) &&
    bigNumberify(board[2][0]).eq(bigNumberify(player));

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
  const winner = bigNumberify(newState[2]).toNumber();

  if (winner === 0) {
    const action = takeTurn(newState, ethAddress);
    const request = {
      params: {
        appInstanceId,
        action
      },
      requestId: generateUUID(),
      type: NodeTypes.MethodName.TAKE_ACTION
    };

    node.call(request.type, request);
  }
}

export function takeTurn(newState: State, ethAddress: Address) {
  const [players, , , board] = newState;
  const botPlayerNumber = players.indexOf(ethAddress) + 1;
  const { playX, playY } = makeMove(board);
  board[playX][playY] = bigNumberify(botPlayerNumber);
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
      if (bigNumberify(board[x][y]).toNumber() === 0) {
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

export async function connectNode(node: Node, ethAddress: Address, multisigAddress) {
  node.on(NodeTypes.EventName.PROPOSE_INSTALL_VIRTUAL, async data => {
    const appInstanceId = data.data.appInstanceId;
    const intermediaries = data.data.params.intermediaries;

    const request = {
      type: NodeTypes.MethodName.INSTALL_VIRTUAL,
      params: {
        appInstanceId,
        intermediaries
      },
      requestId: generateUUID()
    };

    await node.call(request.type, request);

    node.on(NodeTypes.EventName.UPDATE_STATE, async updateEventData => {
      if (updateEventData.data.appInstanceId === appInstanceId) {
        respond(node, ethAddress, updateEventData);
      }
    });

    node.on(NodeTypes.EventName.UNINSTALL_VIRTUAL, data => {
      console.log("got uninstall call: ", data);
    });

    const freeBalance = await node.call(NodeTypes.MethodName.GET_MY_FREE_BALANCE_FOR_STATE, {
      type: NodeTypes.MethodName.GET_MY_FREE_BALANCE_FOR_STATE,
      requestId: generateUUID(),
      params: {
        multisigAddress
      } as NodeTypes.DepositParams
    })
// @ts-ignore
    console.log("freeBalance", freeBalance.result.balance.toString())
  });
}

type Players = Address[];
type State = [Players, number, number, Board];
type BoardSquare = number | BigNumber;
type BoardRow = BoardSquare[];
type Board = BoardRow[];

type Coordinates = {
  x: number;
  y: number;
};
