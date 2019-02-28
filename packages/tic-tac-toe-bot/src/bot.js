const { ethers } = require("ethers");
const { v4 } = require("uuid");
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
      winClaimType: 0,
      idx
    };
  }
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
      winClaimType: 1,
      idx
    };
  }
}

function checkDiagonalVictory(board, player) {
  const victory =
    bn(board[0][0]).eq(bn(player)) &&
    bn(board[1][1]).eq(bn(player)) &&
    bn(board[2][2]).eq(bn(player));

  if (victory) {
    return {
      winClaimType: 2,
      idx: 0
    };
  }
}

function checkCrossDiagonalVictory(board, player) {
  const victory =
    bn(board[0][2]).eq(bn(player)) &&
    bn(board[1][1]).eq(bn(player)) &&
    bn(board[2][0]).eq(bn(player));

  if (victory) {
    return {
      winClaimType: 3,
      idx: 0
    };
  }
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

    node.call(
      request.type,
      request
    );
  }
}

function takeTurn(newState, ethAddress) {
  const [players,,, board] = newState;
  const botPlayerNumber = players.indexOf(ethAddress) + 1;
  const { playX, playY } = makeMove(board, botPlayerNumber);
  board[playX][playY] = ethers.utils.bigNumberify(botPlayerNumber);
  const winClaim = checkVictory(board, botPlayerNumber);

  return {
    actionType: determineActionType(board, botPlayerNumber),
    winClaim: winClaim || { winClaimType: 0, idx: 0 },
    playX,
    playY
  };
}

function makeMove(board) {
  const possibleMoves = [];

  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      if (ethers.utils.bigNumberify(board[x][y]).toNumber() === 0) {
        possibleMoves.push({
          x,
          y
        });
      }
    }
  }

  if (possibleMoves.length === 0) {
    throw new Error("Yikes! No place left to move.");
  }

  const move = possibleMoves[Math.floor(Math.random()*possibleMoves.length)];
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
  } else if (checkDraw(board)) {
    return 2;
  } else {
    return 0;
  }
}

async function connectNode(node, ethAddress) {
  console.log("setup install")
  node.on("proposeInstallVirtualEvent", async (data) => {
    console.log("start install")
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
console.log("request", request)
    await node.call(
      request.type,
      request
    );
console.log("finish install")
    node.on("updateStateEvent", async (updateEventData) => {
      if (updateEventData.data.appInstanceId === appInstanceId) {
        respond(node, ethAddress, updateEventData);
      }
    });
  });
}

module.exports.connectNode = connectNode;
module.exports.takeTurn = takeTurn;