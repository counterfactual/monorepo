import { ethers } from "ethers";
import { v4 } from "uuid";

const bn = ethers.utils.bigNumberify;
const ZERO = bn(0);

function checkDraw(board) {
  return board.every(row => row.every(square => !bn(square).eq(ZERO)));
}

function checkVictory(board, player) {
  return (
    checkHorizontalVictory(board, player) ||
    checkVerticalVictory(board, player) ||
    checkDiagonalVictory(board, player) ||
    checkCrossDiagonalVictory(board, player)
  );
}

function checkHorizontalVictory(board, player) {
  let idx;
  const victory = board.some((row, index) => {
    idx = index;
    return row.every(square => bn(square).eq(bn(player)));
  });

  if (victory) {
    return {
      idx,
      winClaimType: 0
    };
  }
  return false;
}

function checkVerticalVictory(board, player) {
  let idx;
  const victory = board[0].some((columnStart, index) => {
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

function checkDiagonalVictory(board, player) {
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

function checkCrossDiagonalVictory(board, player) {
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

function respond(node, ethAddress, { data: { appInstanceId, newState } }) {
  const winner = ethers.utils.bigNumberify(newState[2]).toNumber();

  if (winner === 0) {
    const action = takeTurn(newState, ethAddress);
    const request = {
      params: {
        appInstanceId,
        action
      },
      requestId: v4(),
      type: "takeAction"
    };

    node.call(request.type, request);
  }
}

export function takeTurn(newState, ethAddress) {
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

function makeMove(board) {
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

function determineActionType(board, botPlayerNumber) {
  if (checkVictory(board, botPlayerNumber)) {
    return 1;
  }
  if (checkDraw(board)) {
    return 2;
  }
  return 0;
}

export async function connectNode(node, ethAddress) {
  node.on("proposeInstallVirtualEvent", async data => {
    const appInstanceId = data.data.appInstanceId;
    const intermediaries = data.data.params.intermediaries;

    const request = {
      type: "installVirtual",
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

type Coordinates = {
  x: number;
  y: number;
};
