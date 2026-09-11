// マンカラ・ベーシック
// 14個の位置: 0-5 = プレイヤー1の陣地、6 = ゴール、
// 7-12 = プレイヤー2の陣地、13 = ゴール。
// ベーシックでは全12ポケットに4個ずつ置き、相手のゴールを含めて
// すべての位置へ反時計回りに配る。最後の石がどちらかのゴールで
// 終われば同じプレイヤーが続け、ポケットで終われば相手の番になる。

export type Player = 1 | 2;
export type Board = number[];

export const INITIAL_STONES = 4;
export const PITS_PER_SIDE = 6;
export const BOARD_SIZE = 14;

export function createInitialBoard(): Board {
  const board = new Array(BOARD_SIZE).fill(INITIAL_STONES);
  board[6] = 0;
  board[13] = 0;
  return board;
}

export function getPlayerPits(player: Player): number[] {
  return player === 1 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
}

export function getPlayerStore(player: Player): number {
  return player === 1 ? 6 : 13;
}

export function getOpponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}

export function isValidMove(board: Board, pit: number, player: Player): boolean {
  return getPlayerPits(player).includes(pit) && board[pit] > 0;
}

export function getValidMoves(board: Board, player: Player): number[] {
  return getPlayerPits(player).filter((pit) => board[pit] > 0);
}

export interface SowingStep {
  pit: number;
  boardAfter: Board;
}

export interface MoveResult {
  newBoard: Board;
  extraTurn: boolean;
  captured: false;
  capturedPit: null;
  sowingPath: number[];
  sowingSteps: SowingStep[];
}

export function makeMove(board: Board, pit: number, player: Player): MoveResult {
  if (!isValidMove(board, pit, player)) {
    throw new Error(`Invalid Mancala Basic move: pit=${pit}, player=${player}`);
  }

  const newBoard = [...board];
  let stones = newBoard[pit];
  newBoard[pit] = 0;
  let currentIndex = pit;
  const sowingPath: number[] = [];
  const sowingSteps: SowingStep[] = [];

  while (stones > 0) {
    currentIndex = (currentIndex + 1) % BOARD_SIZE;
    newBoard[currentIndex] += 1;
    sowingPath.push(currentIndex);
    sowingSteps.push({ pit: currentIndex, boardAfter: [...newBoard] });
    stones -= 1;
  }

  const extraTurn = currentIndex === 6 || currentIndex === 13;

  return {
    newBoard,
    extraTurn,
    captured: false,
    capturedPit: null,
    sowingPath,
    sowingSteps,
  };
}

export function isGameOver(board: Board): boolean {
  const p1Empty = getPlayerPits(1).every((pit) => board[pit] === 0);
  const p2Empty = getPlayerPits(2).every((pit) => board[pit] === 0);
  return p1Empty || p2Empty;
}

// ベーシックでは勝敗は「自陣のポケットを先に空にしたか」で決まる。
// ゴールの石数による精算は行わない。
export function getFinalBoard(board: Board): Board {
  return [...board];
}

export function getWinner(board: Board): Player | 0 {
  const p1Empty = getPlayerPits(1).every((pit) => board[pit] === 0);
  const p2Empty = getPlayerPits(2).every((pit) => board[pit] === 0);
  if (p1Empty && !p2Empty) return 1;
  if (p2Empty && !p1Empty) return 2;
  return 0;
}

function evaluateBoard(board: Board, aiPlayer: Player): number {
  const opponent = getOpponent(aiPlayer);
  const aiPits = getPlayerPits(aiPlayer);
  const oppPits = getPlayerPits(opponent);
  const aiRemaining = aiPits.reduce((sum, pit) => sum + board[pit], 0);
  const oppRemaining = oppPits.reduce((sum, pit) => sum + board[pit], 0);

  if (aiRemaining === 0 && oppRemaining > 0) return 100000;
  if (oppRemaining === 0 && aiRemaining > 0) return -100000;

  let extraTurnPotential = 0;
  const aiStore = getPlayerStore(aiPlayer);
  for (const pit of aiPits) {
    if (board[pit] === aiStore - pit) extraTurnPotential += 2;
  }

  return (oppRemaining - aiRemaining) * 10 + extraTurnPotential;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  currentPlayer: Player,
  aiPlayer: Player,
): number {
  if (depth <= 0 || isGameOver(board)) return evaluateBoard(board, aiPlayer);

  const moves = getValidMoves(board, currentPlayer);
  if (moves.length === 0) return evaluateBoard(board, aiPlayer);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const result = makeMove(board, move, currentPlayer);
      const nextMaximizing = result.extraTurn;
      const nextPlayer = result.extraTurn ? currentPlayer : getOpponent(currentPlayer);
      const value = minimax(result.newBoard, result.extraTurn ? depth : depth - 1, alpha, beta, nextMaximizing, nextPlayer, aiPlayer);
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    const result = makeMove(board, move, currentPlayer);
    const nextMaximizing = result.extraTurn ? false : true;
    const nextPlayer = result.extraTurn ? currentPlayer : getOpponent(currentPlayer);
    const value = minimax(result.newBoard, result.extraTurn ? depth : depth - 1, alpha, beta, nextMaximizing, nextPlayer, aiPlayer);
    best = Math.min(best, value);
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return best;
}

export interface AIMoveInfo {
  move: number;
  score: number;
  allScores: { move: number; score: number }[];
}

export function getBestMove(board: Board, player: Player, depth = 8): AIMoveInfo {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return { move: -1, score: 0, allScores: [] };

  let bestMove = moves[0];
  let bestScore = -Infinity;
  const allScores: { move: number; score: number }[] = [];

  for (const move of moves) {
    const result = makeMove(board, move, player);
    const nextPlayer = result.extraTurn ? player : getOpponent(player);
    const score = minimax(result.newBoard, result.extraTurn ? depth : depth - 1, -Infinity, Infinity, player === nextPlayer, nextPlayer, player);
    allScores.push({ move, score });
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { move: bestMove, score: bestScore, allScores };
}

export function getHint(board: Board): { pit: number; score: number } | null {
  const result = getBestMove(board, 1, 4);
  return result.move < 0 ? null : { pit: result.move, score: result.score };
}
