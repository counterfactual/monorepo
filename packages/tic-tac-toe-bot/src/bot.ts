import { Node, UninstallVirtualMessage } from "@counterfactual/node";
import { Address, Node as NodeTypes } from "@counterfactual/types";
import { ethers } from "ethers";
import { Zero } from "ethers/constants";
import { BigNumber, bigNumberify } from "ethers/utils";
import { v4 as generateUUID } from "uuid";

import { getFreeBalance, renderFreeBalanceInEth } from "./utils";

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

  return victory
    ? {
        idx,
        winClaimType: WinClaimType.COL
      }
    : false;
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

  return victory
    ? {
        idx,
        winClaimType: WinClaimType.ROW
      }
    : false;
}

function checkDiagonalVictory(board: Board, player: number) {
  const victory =
    bigNumberify(board[0][0]).eq(bigNumberify(player)) &&
    bigNumberify(board[1][1]).eq(bigNumberify(player)) &&
    bigNumberify(board[2][2]).eq(bigNumberify(player));

  return victory
    ? {
        idx: 0,
        winClaimType: WinClaimType.DIAG
      }
    : false;
}

function checkCrossDiagonalVictory(board: Board, player: number) {
  const victory =
    bigNumberify(board[0][2]).eq(bigNumberify(player)) &&
    bigNumberify(board[1][1]).eq(bigNumberify(player)) &&
    bigNumberify(board[2][0]).eq(bigNumberify(player));

  return victory
    ? {
        idx: 0,
        winClaimType: WinClaimType.CROSS_DIAG
      }
    : false;
}

function respond(
  node: Node,
  nodeAddress: Address,
  { data: { appInstanceId, newState } }
) {
  const { board, players, turnNum, winner } = newState;
  const playerAddress = ethers.utils.HDNode.fromExtendedKey(
    nodeAddress
  ).derivePath("0").address;
  const botPlayerNumber = players.indexOf(playerAddress) + 1;
  const isBotTurn =
    bigNumberify(turnNum).toNumber() % 2 === botPlayerNumber - 1;
  const noWinnerYet =
    bigNumberify(winner).toNumber() === Winner.GAME_IN_PROGRESS;

  if (noWinnerYet && isBotTurn) {
    const action = takeTurn(board, botPlayerNumber);
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

export function takeTurn(board: Board, botPlayerNumber: number) {
  const { playX, playY } = makeMove(board);
  board[playX][playY] = bigNumberify(botPlayerNumber);
  const winClaim = checkVictory(board, botPlayerNumber);

  return {
    playX,
    playY,
    actionType: determineActionType(board, botPlayerNumber),
    winClaim: winClaim || { winClaimType: WinClaimType.COL, idx: 0 }
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
    return ActionType.PLAY_AND_WIN;
  }
  if (checkDraw(board)) {
    return ActionType.PLAY_AND_DRAW;
  }
  return ActionType.PLAY;
}

export async function connectNode(
  botName: string,
  node: Node,
  botPublicIdentifier: string,
  multisigAddress?: string
) {
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

    try {
      await node.call(request.type, request);
      node.on(NodeTypes.EventName.UPDATE_STATE, async updateEventData => {
        if (updateEventData.data.appInstanceId === appInstanceId) {
          respond(node, botPublicIdentifier, updateEventData);
        }
      });
    } catch (e) {
      console.error("Node call to install virtual app failed.");
      console.error(request);
      console.error(e);
    }
  });

  if (multisigAddress) {
    node.on(
      NodeTypes.EventName.UNINSTALL_VIRTUAL,
      async (uninstallMsg: UninstallVirtualMessage) => {
        console.info(`Uninstalled app`);
        console.info(uninstallMsg);
        renderFreeBalanceInEth(await getFreeBalance(node, multisigAddress));
      }
    );
  }
  console.info(`Bot ${botName} is ready to serve`);
}

type BoardSquare = number | BigNumber;
type BoardRow = BoardSquare[];
type Board = BoardRow[];

type Coordinates = {
  x: number;
  y: number;
};

enum Winner {
  GAME_IN_PROGRESS = 0,
  PLAYER_1,
  PLAYER_2,
  GAME_DRAWN
}

enum ActionType {
  PLAY = 0,
  PLAY_AND_WIN,
  PLAY_AND_DRAW,
  DRAW
}

enum WinClaimType {
  COL = 0,
  ROW,
  DIAG,
  CROSS_DIAG
}
