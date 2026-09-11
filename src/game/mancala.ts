// マンカラの正しいルール実装
// ボード: 14個の穴
// 0-5: プレイヤー1の穴（下側）
// 6: プレイヤー1のマンカラ（ストア）
// 7-12: プレイヤー2の穴（上側）
// 13: プレイヤー2のマンカラ（ストア）

export type Player = 1 | 2;
export type Board = number[];

export const INITIAL_STONES = 3; // カラハの標準ルール
export const PITS_PER_SIDE = 6;

export function createInitialBoard(): Board {
  const board: Board = new Array(14).fill(INITIAL_STONES);
  board[6] = 0;  // プレイヤー1のマンカラ
  board[13] = 0; // プレイヤー2のマンカラ
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

export function getOppositePit(pit: number): number {
  // 穴iの反対側は (12 - i)
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

export interface SowingStep {
  pit: number;
  boardAfter: Board;
}

export interface MoveResult {
  newBoard: Board;
  extraTurn: boolean;
  captured: boolean;
  capturedPit: number | null;
  sowingPath: number[];
  sowingSteps: SowingStep[];
}

export function makeMove(board: Board, pit: number, player: Player): MoveResult {
  const newBoard = [...board];
  let stones = newBoard[pit];
  newBoard[pit] = 0;
  let currentIndex = pit;
  let extraTurn = false;
  let captured = false;
  let capturedPit: number | null = null;
  const sowingPath: number[] = [];
  const sowingSteps: SowingStep[] = [];

  // 石を反時計回りに1つずつ配る
  while (stones > 0) {
    currentIndex = (currentIndex + 1) % 14;
    
    // 相手のマンカラには石を入れない
    if (player === 1 && currentIndex === 13) continue;
    if (player === 2 && currentIndex === 6) continue;

    newBoard[currentIndex]++;
    sowingPath.push(currentIndex);
    sowingSteps.push({ pit: currentIndex, boardAfter: [...newBoard] });
    stones--;
  }

  // 最後の石が自分のマンカラに入ったらボーナスターン
  const playerStore = getPlayerStore(player);
  if (currentIndex === playerStore) {
    extraTurn = true;
  }

  // キャプチャ: 最後の石が自分の側の空の穴に入ったら
  // 反対側の穴の石と自分のマンカラに入れる
  const playerPits = getPlayerPits(player);
  if (playerPits.includes(currentIndex) && newBoard[currentIndex] === 1) {
    const oppositePit = getOppositePit(currentIndex);
    if (newBoard[oppositePit] > 0) {
      newBoard[playerStore] += newBoard[oppositePit] + 1;
      newBoard[oppositePit] = 0;
      newBoard[currentIndex] = 0;
      captured = true;
      capturedPit = oppositePit;
    }
  }

  return { newBoard, extraTurn, captured, capturedPit, sowingPath, sowingSteps };
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

  // 残った石を各プレイヤーのマンカラに入れる
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
  return 0; // 引き分け
}

// 強化されたAI評価関数
function evaluateBoard(board: Board, aiPlayer: Player): number {
  const aiStore = getPlayerStore(aiPlayer);
  const opponentStore = getPlayerStore(getOpponent(aiPlayer));
  
  // マンカラの石の差（最重要）
  const storeDiff = board[aiStore] - board[opponentStore];
  
  // 自分の穴の石の総数
  const aiPits = getPlayerPits(aiPlayer);
  const oppPits = getPlayerPits(getOpponent(aiPlayer));
  const aiPitStones = aiPits.reduce((s, p) => s + board[p], 0);
  const oppPitStones = oppPits.reduce((s, p) => s + board[p], 0);
  
  // 空の穴の数（キャプチャの機会）
  const aiEmptyPits = aiPits.filter(p => board[p] === 0).length;
  const oppEmptyPits = oppPits.filter(p => board[p] === 0).length;
  
  // 相手の空の穴はキャプチャの機会（良い）
  // 自分の空の穴はキャプチャされるリスク（悪い）
  const captureOpportunity = oppEmptyPits * 2;
  const captureRisk = aiEmptyPits * 1.5;
  
  // 最後の石がマンカラに入る可能性を評価
  let extraTurnPotential = 0;
  for (const pit of aiPits) {
    if (board[pit] > 0) {
      const distance = aiStore - pit;
      if (distance > 0 && board[pit] === distance) {
        extraTurnPotential += 3; // ボーナスターンの機会
      }
    }
  }
  
  // 総合評価
  return storeDiff * 3 + 
         (aiPitStones - oppPitStones) * 0.5 + 
         captureOpportunity - 
         captureRisk + 
         extraTurnPotential;
}

// ミニマックス法（アルファベータ枝刈り付き）
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
        // ボーナスターンの場合、深さを減らさない
        evalScore = minimax(newBoard, depth, alpha, beta, true, currentPlayer, aiPlayer);
      } else {
        evalScore = minimax(newBoard, depth - 1, alpha, beta, false, getOpponent(currentPlayer), aiPlayer);
      }
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // アルファベータ枝刈り
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const { newBoard, extraTurn } = makeMove(board, move, currentPlayer);
      let evalScore: number;
      if (extraTurn) {
        evalScore = minimax(newBoard, depth, alpha, beta, false, currentPlayer, aiPlayer);
      } else {
        evalScore = minimax(newBoard, depth - 1, alpha, beta, true, getOpponent(currentPlayer), aiPlayer);
      }
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // アルファベータ枝刈り
    }
    return minEval;
  }
}

export interface AIMoveInfo {
  move: number;
  score: number;
  allScores: { move: number; score: number }[];
}

export function getBestMove(board: Board, player: Player, depth: number = 8): AIMoveInfo {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return { move: -1, score: 0, allScores: [] };

  let bestMove = moves[0];
  let bestScore = -Infinity;
  const allScores: { move: number; score: number }[] = [];

  for (const move of moves) {
    const { newBoard, extraTurn } = makeMove(board, move, player);
    let score: number;
    if (extraTurn) {
      score = minimax(newBoard, depth, -Infinity, Infinity, true, player, player);
    } else {
      score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, getOpponent(player), player);
    }
    allScores.push({ move, score });
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { move: bestMove, score: bestScore, allScores };
}

// プレイヤー用のヒント（浅い探索）
export function getHint(board: Board): { pit: number; score: number } | null {
  const moves = getValidMoves(board, 1);
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const { newBoard, extraTurn } = makeMove(board, move, 1);
    let score: number;
    if (extraTurn) {
      score = minimax(newBoard, 5, -Infinity, Infinity, true, 1, 1);
    } else {
      score = minimax(newBoard, 4, -Infinity, Infinity, false, 2, 1);
    }
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { pit: bestMove, score: bestScore };
}
