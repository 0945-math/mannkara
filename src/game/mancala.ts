// Mancala Game Logic
// Board: 14 pits
// 0-5: Player 1's pits (bottom)
// 6: Player 1's store (Mancala)
// 7-12: Player 2's pits (top)
// 13: Player 2's store (Mancala)

export type Player = 1 | 2;
export type Board = number[];

export const INITIAL_STONES = 4;
export const PITS_PER_SIDE = 6;

export function createInitialBoard(): Board {
  const board: Board = new Array(14).fill(INITIAL_STONES);
  board[6] = 0;  // Player 1's store
  board[13] = 0; // Player 2's store
  return board;
}

export function getPlayerPits(player: Player): number[] {
  if (player === 1) return [0, 1, 2, 3, 4, 5];
  return [7, 8, 9, 10, 11, 12];
}

export function getPlayerStore(player: Player): number {
  return player === 1 ? 6 : 13;
}

export function getOpponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}

export function getOppositePit(pit: number): number {
  // The opposite pit of pit i is (12 - i)
  return 12 - pit;
}

export function isValidMove(board: Board, pit: number, player: Player): boolean {
  const playerPits = getPlayerPits(player);
  if (!playerPits.includes(pit)) return false;
  return board[pit] > 0;
}

export function getValidMoves(board: Board, player: Player): number[] {
  return getPlayerPits(player).filter(pit => board[pit] > 0);
}

export function makeMove(board: Board, pit: number, player: Player): { newBoard: Board; extraTurn: boolean } {
  const newBoard = [...board];
  let stones = newBoard[pit];
  newBoard[pit] = 0;
  let currentIndex = pit;
  let extraTurn = false;

  while (stones > 0) {
    currentIndex = (currentIndex + 1) % 14;
    // Skip opponent's store
    if (player === 1 && currentIndex === 13) continue;
    if (player === 2 && currentIndex === 6) continue;

    newBoard[currentIndex]++;
    stones--;
  }

  // Check if last stone landed in player's own store -> extra turn
  const playerStore = getPlayerStore(player);
  if (currentIndex === playerStore) {
    extraTurn = true;
  }

  // Check capture: last stone landed in empty pit on player's side
  const playerPits = getPlayerPits(player);
  if (playerPits.includes(currentIndex) && newBoard[currentIndex] === 1) {
    const oppositePit = getOppositePit(currentIndex);
    if (newBoard[oppositePit] > 0) {
      newBoard[playerStore] += newBoard[oppositePit] + 1;
      newBoard[oppositePit] = 0;
      newBoard[currentIndex] = 0;
    }
  }

  return { newBoard, extraTurn };
}

export function isGameOver(board: Board): boolean {
  const p1Pits = getPlayerPits(1);
  const p2Pits = getPlayerPits(2);

  const p1Empty = p1Pits.every(pit => board[pit] === 0);
  const p2Empty = p2Pits.every(pit => board[pit] === 0);

  return p1Empty || p2Empty;
}

export function getFinalBoard(board: Board): Board {
  const finalBoard = [...board];
  const p1Pits = getPlayerPits(1);
  const p2Pits = getPlayerPits(2);

  // Collect remaining stones
  let p1Remaining = 0;
  let p2Remaining = 0;

  p1Pits.forEach(pit => {
    p1Remaining += finalBoard[pit];
    finalBoard[pit] = 0;
  });

  p2Pits.forEach(pit => {
    p2Remaining += finalBoard[pit];
    finalBoard[pit] = 0;
  });

  finalBoard[6] += p1Remaining;
  finalBoard[13] += p2Remaining;

  return finalBoard;
}

export function getWinner(board: Board): Player | 0 {
  if (board[6] > board[13]) return 1;
  if (board[13] > board[6]) return 2;
  return 0; // draw
}

// AI - Minimax with Alpha-Beta Pruning
function evaluateBoard(board: Board, aiPlayer: Player): number {
  const aiStore = getPlayerStore(aiPlayer);
  const opponentStore = getPlayerStore(getOpponent(aiPlayer));
  return board[aiStore] - board[opponentStore];
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  currentPlayer: Player,
  aiPlayer: Player
): number {
  if (depth === 0 || isGameOver(board)) {
    const finalBoard = isGameOver(board) ? getFinalBoard(board) : board;
    return evaluateBoard(finalBoard, aiPlayer);
  }

  const moves = getValidMoves(board, currentPlayer);
  if (moves.length === 0) return evaluateBoard(board, aiPlayer);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const { newBoard, extraTurn } = makeMove(board, move, currentPlayer);
      let evalScore: number;
      if (extraTurn) {
        evalScore = minimax(newBoard, depth - 1, alpha, beta, true, currentPlayer, aiPlayer);
      } else {
        evalScore = minimax(newBoard, depth - 1, alpha, beta, false, getOpponent(currentPlayer), aiPlayer);
      }
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const { newBoard, extraTurn } = makeMove(board, move, currentPlayer);
      let evalScore: number;
      if (extraTurn) {
        evalScore = minimax(newBoard, depth - 1, alpha, beta, false, currentPlayer, aiPlayer);
      } else {
        evalScore = minimax(newBoard, depth - 1, alpha, beta, true, getOpponent(currentPlayer), aiPlayer);
      }
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getBestMove(board: Board, player: Player, depth: number = 6): number {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return -1;

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const { newBoard, extraTurn } = makeMove(board, move, player);
    let score: number;
    if (extraTurn) {
      score = minimax(newBoard, depth - 1, -Infinity, Infinity, true, player, player);
    } else {
      score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, getOpponent(player), player);
    }
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
