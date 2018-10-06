import * as Utils from "@counterfactual/test-utils";
import * as ethers from "ethers";
import { MerkleTree } from "openzeppelin-solidity/test/helpers/merkleTree.js";

const Battleship = artifacts.require("Battleship");
const StaticCall = artifacts.require("StaticCall");
const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

class BattleshipBoard {
  private board: number[][];
  private salts: number[][];
  private merkleTree: MerkleTree;

  constructor(playerBoard: number[][]) {
    this.board = playerBoard;
    this.salts = this.board.map(arr => this.generateSalt(arr.length));
    this.generateMerkleTree();
  }

  public getMerkleRoot() {
    return this.merkleTree.getHexRoot();
  }

  public getLeaf(x: number, y: number) {
    return ethers.utils.solidityKeccak256(
      ["uint256", "uint256", "uint256", "uint256"],
      [this.board[x][y], x, y, this.salts[x][y]]
    );
  }

  public getMerkleProof(x: number, y: number) {
    return this.merkleTree.getHexProof(
      ethers.utils.solidityKeccak256(
        ["uint256", "uint256", "uint256", "uint256"],
        [this.board[x][y], x, y, this.salts[x][y]]
      )
    );
  }

  public getBoard() {
    return this.board;
  }
  public getSalts() {
    return this.salts;
  }

  private generateMerkleTree() {
    const elems = new Array(100);
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const temp = ethers.utils.solidityKeccak256(
          ["uint256", "uint256", "uint256", "uint256"],
          [this.board[i][j], i, j, this.salts[i][j]]
        );
        elems.push(temp);
      }
    }
    this.merkleTree = new MerkleTree(elems);
  }

  private generateSalt(len: number): number[] {
    return Array.from({ length: len }, () =>
      Math.floor(Math.random() * 1000000)
    );
  }
}

contract("Battleship", (accounts: string[]) => {
  let game: ethers.Contract;
  let board1: BattleshipBoard;
  let board2: BattleshipBoard;
  let prevState: any;
  let prevMoveX: number;
  let prevMoveY: number;

  const stateEncoding =
    "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[10][10] player1Board, uint256[10][10] player2Board, bytes32 player1MerkleRoot, bytes32 player2MerkleRoot, uint256 player1SunkCount,  uint256 player2SunkCount, uint256 prevMoveX, uint256 prevMoveY)";

  before(async () => {
    Battleship.link("StaticCall", StaticCall.address);
    const contractFactory = new ethers.ContractFactory(
      Battleship.abi,
      Battleship.binary,
      unlockedAccount
    );
    game = await contractFactory.deploy();
    // 1's represent squares which contains a ship
    board1 = new BattleshipBoard([
      [1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]);
    board2 = new BattleshipBoard([
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
    ]);
    // Initial state
    prevState = {
      players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
      turnNum: 0,
      winner: 0,
      player1Board: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      ],
      player2Board: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      ],
      player1MerkleRoot: board2.getMerkleRoot(),
      player2MerkleRoot: board2.getMerkleRoot(),
      player1SunkCount: 0,
      player2SunkCount: 0,
      prevMoveX: 0,
      prevMoveY: 0
    };
  });

  describe("applyAction", () => {
    it("play first move", async () => {
      const action = {
        actionType: 0,
        currMoveX: 9,
        currMoveY: 0,
        prevMoveHitOrMiss: 2, // Won't be used, still encoding
        prevMoveSalt: 0,
        prevMoveMerkleProof: new Array(0)
      };
      const ret = await game.functions.applyAction(prevState, action);

      const currState = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      currState.player2Board[9][0].should.be.bignumber.eq(1);
      prevState = currState;
      prevMoveX = action.currMoveX;
      prevMoveY = action.currMoveY;
    });

    it("play second move", async () => {
      const action = {
        actionType: 0,
        currMoveX: 0,
        currMoveY: 0,
        prevMoveHitOrMiss: 3,
        prevMoveSalt: board2.getSalts()[prevMoveX][prevMoveY],
        prevMoveMerkleProof: board2.getMerkleProof(prevMoveX, prevMoveY)
      };
      const ret = await game.functions.applyAction(prevState, action);

      const currState = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      currState.player1Board[0][0].should.be.bignumber.eq(1);
      currState.player2Board[9][0].should.be.bignumber.eq(3);
      prevState = currState;
      prevMoveX = action.currMoveX;
      prevMoveY = action.currMoveY;
    });

    // Game UI should not allow it. Can allow it in the interpreter to punish stupidity. Checking for now.
    it("cannot fill already filled square", async () => {
      const action = {
        actionType: 0,
        currMoveX: 9,
        currMoveY: 0,
        prevMoveHitOrMiss: 2,
        prevMoveSalt: board2.getSalts()[prevMoveX][prevMoveY],
        prevMoveMerkleProof: board2.getMerkleProof(prevMoveX, prevMoveY)
      };
      await Utils.assertRejects(game.functions.applyAction(prevState, action));
    });

    it("wrong prevMoveSalt", async () => {
      const action = {
        actionType: 0,
        currMoveX: 0,
        currMoveY: 0,
        prevMoveHitOrMiss: 2,
        prevMoveSalt: board2.getSalts()[5][prevMoveY],
        prevMoveMerkleProof: board2.getMerkleProof(prevMoveX, prevMoveY)
      };
      await Utils.assertRejects(game.functions.applyAction(prevState, action));
    });

    it("wrong prevMoveMerkleProof", async () => {
      const action = {
        actionType: 0,
        currMoveX: 0,
        currMoveY: 0,
        prevMoveHitOrMiss: 2,
        prevMoveSalt: board2.getSalts()[5][prevMoveY],
        prevMoveMerkleProof: board2
          .getMerkleProof(prevMoveX, prevMoveY)
          .slice(1, 7)
      };
      await Utils.assertRejects(game.functions.applyAction(prevState, action));
    });

    it("play winning move", async () => {
      prevState = {
        players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
        turnNum: 2, // Ignoring check to avoid calculating turn number in which winning move would happen. Need to fix logic in interpreter
        winner: 0,
        player1Board: [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ],

        player2Board: [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [3, 3, 0, 0, 0, 0, 0, 0, 0, 0],
          [3, 3, 3, 0, 0, 0, 0, 0, 0, 0],
          [3, 3, 3, 0, 0, 0, 0, 0, 0, 0],
          [3, 3, 3, 3, 0, 0, 0, 0, 0, 0],
          [3, 3, 3, 3, 3, 0, 0, 0, 0, 0]
        ], // need to check sum(board[i][j])==17 in interpreter.
        player1MerkleRoot: board2.getMerkleRoot(),
        player2MerkleRoot: board2.getMerkleRoot(),
        player1SunkCount: 0,
        player2SunkCount: 17,
        prevMoveX: 0,
        prevMoveY: 0
      };

      const action = {
        actionType: 1,
        currMoveX: 0, // doesn't matter
        currMoveY: 0, // doesn't matter
        prevMoveHitOrMiss: 2, // doesn't matter
        prevMoveSalt: board2.getSalts()[prevMoveX][prevMoveY], // doesn't matter
        prevMoveMerkleProof: board2.getMerkleProof(prevMoveX, prevMoveY) // doesn't matter
      };
      const ret = await game.functions.applyAction(prevState, action);

      const currState = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      currState.winner.should.be.bignumber.eq(1);
    });
  });
});
