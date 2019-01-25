const bn = window.ethers.utils.bigNumberify;
const ZERO = bn(0);

export function checkDraw(board) {
  return board.every(row => row.every(square => !bn(square).eq(ZERO)));
}

export function checkVictory(board, player) {
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
      columnStart === bn(player).toNumber() &&
      board[1][index] === bn(player).toNumber() &&
      board[2][index] === bn(player).toNumber()
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
