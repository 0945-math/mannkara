import { Board, Player, makeMove, isGameOver, getWinner, getValidMoves, getOpponent } from './mancala';

export function getBestMoveMCTS(
  board: Board,
  player: Player,
  iterations = 1000,
): { move: number; score: number; allScores: { move: number; score: number }[] } {
  const moves = getValidMoves(board, player);
  if (!moves.length) return { move: -1, score: 0, allScores: [] };

  const scores = moves.map(move => {
    let wins = 0;
    for (let i = 0; i < Math.max(1, Math.floor(iterations / moves.length)); i++) {
      let state = makeMove(board, move, player);
      let current: Player = state.extraTurn ? player : getOpponent(player);
      let steps = 0;
      while (!isGameOver(state.newBoard) && steps++ < 300) {
        const nextMoves = getValidMoves(state.newBoard, current);
        if (!nextMoves.length) break;
        const next = nextMoves[Math.floor(Math.random() * nextMoves.length)];
        state = makeMove(state.newBoard, next, current);
        if (!state.extraTurn) current = getOpponent(current);
      }
      if (getWinner(state.newBoard) === player) wins++;
    }
    return { move, score: wins / Math.max(1, Math.floor(iterations / moves.length)) };
  });

  return { move: scores.reduce((best, x) => x.score > best.score ? x : best, scores[0]).move,
    score: Math.max(...scores.map(x => x.score)), allScores: scores };
}
