export function checkDraw(board) {
  return board.every((row) => row.every((square) => square !== 0));
}

export function checkVictory(board, player) {
  return checkHorizontalVictory(board, player)
    || checkVerticalVictory(board, player)
    || checkDiagonalVictory(board, player)
    || checkCrossDiagonalVictory(board, player);
}

function checkHorizontalVictory(board, player) {
  let idx;
  const victory = board.some((row, index) => {
    idx = index;
    return row.every((square) => square === player);
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
    return columnStart === player
      && board[1][index] === player
      && board[2][index] === player
  });

  if (victory) {
    return {
      winClaimType: 1,
      idx
    };
  }
}

function checkDiagonalVictory(board, player) {
  const victory = board[0][0] === player
    && board[1][1] === player
    && board[2][2] === player;

  if (victory) {
    return {
      winClaimType: 2,
      idx: 0
    };
  }
}

function checkCrossDiagonalVictory(board, player) {
  const victory = board[0][2] === player
    && board[1][1] === player
    && board[2][0] === player;

  if (victory) {
    return {
      winClaimType: 3,
      idx: 0
    };
  }
}