// モンテカルロ木探索（MCTS）実装
// AlphaGoと同様のアプローチ

import {
  Board,
  Player,
  makeMove,
  isGameOver,
  getFinalBoard,
  getWinner,
  getValidMoves,
  getPlayerStore,
  getOpponent,
} from './mancala';

// MCTSノード
class MCTSNode {
  board: Board;
  player: Player;
  parent: MCTSNode | null;
  children: Map<number, MCTSNode>;
  wins: number;
  visits: number;
  untriedMoves: number[];

  constructor(board: Board, player: Player, parent: MCTSNode | null = null) {
    this.board = board;
    this.player = player;
    this.parent = parent;
    this.children = new Map();
    this.wins = 0;
    this.visits = 0;
    this.untriedMoves = getValidMoves(board, player);
  }

  // UCB1（Upper Confidence Bound）
  ucb1(exploration: number = 1.414): number {
    if (this.visits === 0) return Infinity;
    const exploitation = this.wins / this.visits;
    const exploration_term = exploration * Math.sqrt(Math.log(this.parent!.visits) / this.visits);
    return exploitation + exploration_term;
  }

  isFullyExpanded(): boolean {
    return this.untriedMoves.length === 0;
  }
}

// MCTSクラス
export class MCTS {
  private root: MCTSNode;
  private aiPlayer: Player;
  private exploration: number;
  private simulationCount: number;

  constructor(board: Board, player: Player, exploration: number = 1.414) {
    this.root = new MCTSNode(board, player);
    this.aiPlayer = player;
    this.exploration = exploration;
    this.simulationCount = 0;
  }

  // 選択フェーズ
  private select(): MCTSNode {
    let node = this.root;
    
    while (node.isFullyExpanded() && node.children.size > 0) {
      let bestChild: MCTSNode | null = null;
      let bestUCB = -Infinity;
      
      for (const child of node.children.values()) {
        const ucb = child.ucb1(this.exploration);
        if (ucb > bestUCB) {
          bestUCB = ucb;
          bestChild = child;
        }
      }
      
      node = bestChild!;
    }
    
    return node;
  }

  // 展開フェーズ
  private expand(node: MCTSNode): MCTSNode {
    if (node.untriedMoves.length === 0) return node;
    
    const move = node.untriedMoves[Math.floor(Math.random() * node.untriedMoves.length)];
    node.untriedMoves = node.untriedMoves.filter(m => m !== move);
    
    const { newBoard, extraTurn } = makeMove(node.board, move, node.player);
    
    // ゲーム終了チェック
    if (isGameOver(newBoard)) {
      const finalBoard = getFinalBoard(newBoard);
      const winner = getWinner(finalBoard);
      return this.createTerminalNode(newBoard, node.player, node, winner);
    }
    
    // 次のプレイヤー
    const nextPlayer = extraTurn ? node.player : getOpponent(node.player);
    const childNode = new MCTSNode(newBoard, nextPlayer, node);
    node.children.set(move, childNode);
    
    return childNode;
  }

  // ターミナルノード作成
  private createTerminalNode(board: Board, player: Player, parent: MCTSNode, winner: Player | 0): MCTSNode {
    const node = new MCTSNode(board, player, parent);
    node.untriedMoves = []; // 展開しない
    
    if (winner === this.aiPlayer) {
      node.wins = 1;
    } else if (winner === 0) {
      node.wins = 0.5;
    } else {
      node.wins = 0;
    }
    node.visits = 1;
    
    return node;
  }

  // シミュレーションフェーズ（ランダムプレイアウト）
  private simulate(node: MCTSNode): Player | 0 {
    let currentBoard = [...node.board];
    let currentPlayer = node.player;
    
    // ゲーム終了までランダムに手を進める
    while (!isGameOver(currentBoard)) {
      const moves = getValidMoves(currentBoard, currentPlayer);
      if (moves.length === 0) break;
      
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      const { newBoard, extraTurn } = makeMove(currentBoard, randomMove, currentPlayer);
      currentBoard = newBoard;
      
      if (!extraTurn) {
        currentPlayer = getOpponent(currentPlayer);
      }
    }
    
    const finalBoard = getFinalBoard(currentBoard);
    return getWinner(finalBoard);
  }

  // 逆伝播フェーズ
  private backpropagate(node: MCTSNode, winner: Player | 0): void {
    let current: MCTSNode | null = node;
    
    while (current !== null) {
      current.visits++;
      
      if (winner === this.aiPlayer) {
        current.wins += 1;
      } else if (winner === 0) {
        current.wins += 0.5;
      }
      // 相手の勝利の場合はwinsを増やさない
      
      current = current.parent;
    }
  }

  // MCTS実行
  search(iterations: number): { move: number; score: number; allScores: { move: number; score: number }[] } {
    for (let i = 0; i < iterations; i++) {
      this.simulationCount++;
      
      // 1. 選択
      const node = this.select();
      
      // 2. 展開（まだゲーム終了していない場合）
      if (!isGameOver(node.board)) {
        const expandedNode = this.expand(node);
        
        // 3. シミュレーション
        const winner = this.simulate(expandedNode);
        
        // 4. 逆伝播
        this.backpropagate(expandedNode, winner);
      }
    }
    
    // 最善の手を選択
    let bestMove = -1;
    let bestVisits = -1;
    const allScores: { move: number; score: number }[] = [];
    
    for (const [move, child] of this.root.children.entries()) {
      const winRate = child.visits > 0 ? child.wins / child.visits : 0;
      allScores.push({ move, score: winRate });
      
      if (child.visits > bestVisits) {
        bestVisits = child.visits;
        bestMove = move;
      }
    }
    
    const bestScore = bestMove >= 0 ? (this.root.children.get(bestMove)?.wins || 0) / (this.root.children.get(bestMove)?.visits || 1) : 0;
    
    return { move: bestMove, score: bestScore, allScores };
  }

  getSimulationCount(): number {
    return this.simulationCount;
  }
}

// 既存のインターフェースに合わせる
export function getBestMoveMCTS(board: Board, player: Player, iterations: number = 1000): {
  move: number;
  score: number;
  allScores: { move: number; score: number }[];
} {
  const mcts = new MCTS(board, player, 1.414);
  return mcts.search(iterations);
}
