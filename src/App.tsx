import { useState, useCallback, useEffect } from 'react';
import {
  Board,
  Player,
  createInitialBoard,
  makeMove,
  isGameOver,
  getFinalBoard,
  getWinner,
  getValidMoves,
  getBestMove,
  isValidMove,
} from './game/mancala';

type Difficulty = 'easy' | 'medium' | 'hard';

function getAIDepth(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 2;
    case 'medium': return 4;
    case 'hard': return 6;
  }
}

function StonePile({ count, size = 'normal' }: { count: number; size?: 'normal' | 'large' }) {
  if (count === 0) return null;

  const baseSize = size === 'large' ? 'w-16 h-16' : 'w-12 h-12';

  return (
    <div className={`${baseSize} relative flex items-center justify-center`}>
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5 p-1">
        {Array.from({ length: Math.min(count, 12) }).map((_, i) => (
          <div
            key={i}
            className="rounded-full bg-amber-600 shadow-sm"
            style={{
              width: size === 'large' ? '8px' : '6px',
              height: size === 'large' ? '8px' : '6px',
              backgroundColor: `hsl(${25 + (i % 5) * 5}, ${70 + (i % 3) * 10}%, ${30 + (i % 4) * 5}%)`,
            }}
          />
        ))}
      </div>
      <span className={`relative z-10 font-bold text-white text-shadow ${size === 'large' ? 'text-xl' : 'text-lg'}`}>
        {count}
      </span>
    </div>
  );
}

export default function App() {
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | 0 | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [aiThinking, setAiThinking] = useState(false);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('あなたの番です。穴を選んでください。');
  const [gameStarted, setGameStarted] = useState(false);
  const [animatingPits, setAnimatingPits] = useState<Set<number>>(new Set());

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setCurrentPlayer(1);
    setGameOver(false);
    setWinner(null);
    setAiThinking(false);
    setLastMove(null);
    setMessage('あなたの番です。穴を選んでください。');
    setGameStarted(true);
    setAnimatingPits(new Set());
  }, []);

  const handlePlayerMove = useCallback((pit: number) => {
    if (gameOver || currentPlayer !== 1 || aiThinking) return;
    if (!isValidMove(board, pit, 1)) return;

    const { newBoard, extraTurn } = makeMove(board, pit, 1);
    setBoard(newBoard);
    setLastMove(pit);
    setAnimatingPits(new Set([pit]));

    if (isGameOver(newBoard)) {
      const finalBoard = getFinalBoard(newBoard);
      setBoard(finalBoard);
      setGameOver(true);
      setWinner(getWinner(finalBoard));
      setMessage(finalBoard[6] > finalBoard[13] ? '🎉 あなたの勝ちです！' :
                 finalBoard[13] > finalBoard[6] ? '😔 AIの勝ちです...' : '🤝 引き分けです！');
      return;
    }

    if (extraTurn) {
      setCurrentPlayer(1);
      setMessage('ボーナスターン！もう一度どうぞ。');
    } else {
      setCurrentPlayer(2);
      setMessage('🤖 AIが考えています...');
    }
  }, [board, currentPlayer, gameOver, aiThinking]);

  // AI Move
  useEffect(() => {
    if (currentPlayer === 2 && !gameOver && gameStarted) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        const bestMove = getBestMove(board, 2, getAIDepth(difficulty));
        if (bestMove === -1) return;

        const { newBoard, extraTurn } = makeMove(board, bestMove, 2);
        setBoard(newBoard);
        setLastMove(bestMove);
        setAnimatingPits(new Set([bestMove]));

        if (isGameOver(newBoard)) {
          const finalBoard = getFinalBoard(newBoard);
          setBoard(finalBoard);
          setGameOver(true);
          setWinner(getWinner(finalBoard));
          setMessage(finalBoard[6] > finalBoard[13] ? '🎉 あなたの勝ちです！' :
                     finalBoard[13] > finalBoard[6] ? '😔 AIの勝ちです...' : '🤝 引き分けです！');
        } else if (extraTurn) {
          setCurrentPlayer(2);
          setMessage('🤖 AIがボーナスターン！');
        } else {
          setCurrentPlayer(1);
          setMessage('あなたの番です。穴を選んでください。');
        }
        setAiThinking(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameOver, board, difficulty, gameStarted]);

  const validMoves = currentPlayer === 1 ? getValidMoves(board, 1) : [];

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 flex items-center justify-center p-4">
        <div className="bg-amber-950/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 max-w-lg w-full text-center shadow-2xl border border-amber-700/50">
          <h1 className="text-5xl md:text-6xl font-bold text-amber-100 mb-4">
            🏺 マンカラ
          </h1>
          <p className="text-amber-200/80 text-lg mb-8">
            世界最古のボードゲームでAIと対戦しよう
          </p>

          <div className="mb-8">
            <h3 className="text-amber-200 text-lg mb-3 font-semibold">難易度を選択</h3>
            <div className="flex gap-3 justify-center">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    difficulty === d
                      ? 'bg-amber-500 text-amber-950 shadow-lg scale-105'
                      : 'bg-amber-800/50 text-amber-200 hover:bg-amber-700/50'
                  }`}
                >
                  {d === 'easy' ? '🌱 簡単' : d === 'medium' ? '🌿 普通' : '🌳 難しい'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={resetGame}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 px-8 py-4 rounded-2xl text-xl font-bold hover:from-amber-400 hover:to-yellow-400 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            ゲーム開始 🎮
          </button>

          <div className="mt-8 text-left bg-amber-900/50 rounded-xl p-4">
            <h4 className="text-amber-200 font-semibold mb-2">📖 ルール</h4>
            <ul className="text-amber-200/70 text-sm space-y-1">
              <li>• 自分の穴を選んで、石を反時計回りに1つずつ配ります</li>
              <li>• 最後の石が自分のマンカラに入ったらボーナスターン</li>
              <li>• 最後の石が自分の空の穴に入ったら、反対側の石をゲット</li>
              <li>• どちらかの穴が空になったらゲーム終了</li>
              <li>• マンカラに最も多くの石を集めた方が勝ち！</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-4xl mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-amber-100">🏺 マンカラ</h1>
          <div className="flex gap-2">
            <button
              onClick={resetGame}
              className="bg-amber-700/50 hover:bg-amber-600/50 text-amber-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 リセット
            </button>
            <button
              onClick={() => setGameStarted(false)}
              className="bg-amber-700/50 hover:bg-amber-600/50 text-amber-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ⚙️ 設定
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      <div className={`mb-4 px-6 py-3 rounded-xl text-center font-medium text-lg transition-all duration-300 ${
        gameOver
          ? winner === 1 ? 'bg-green-500/20 text-green-200 border border-green-500/30' :
            winner === 2 ? 'bg-red-500/20 text-red-200 border border-red-500/30' :
            'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
          : 'bg-amber-950/50 text-amber-100 border border-amber-700/30'
      }`}>
        {aiThinking && (
          <span className="inline-block mr-2 animate-spin">⚙️</span>
        )}
        {message}
      </div>

      {/* Score Display */}
      <div className="w-full max-w-4xl mb-2 flex justify-between px-4">
        <div className="text-amber-200/80 text-sm">
          <span className="font-semibold">🤖 AI</span>
          <span className="ml-2 bg-amber-950/50 px-2 py-0.5 rounded">{board[13]}</span>
        </div>
        <div className="text-amber-200/80 text-sm">
          <span className="font-semibold">あなた 👤</span>
          <span className="ml-2 bg-amber-950/50 px-2 py-0.5 rounded">{board[6]}</span>
        </div>
      </div>

      {/* Game Board */}
      <div className="bg-gradient-to-b from-amber-800 to-amber-900 rounded-3xl p-4 md:p-6 shadow-2xl border-2 border-amber-700/50 w-full max-w-4xl">
        <div className="flex items-stretch gap-2 md:gap-4">
          {/* Player 1 Store (Left) */}
          <div className="flex flex-col justify-center">
            <div className={`w-16 h-48 md:w-20 md:h-56 bg-amber-950/60 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              currentPlayer === 1 && !gameOver ? 'border-amber-400 shadow-lg shadow-amber-400/20' : 'border-amber-800/50'
            }`}>
              <StonePile count={board[6]} size="large" />
            </div>
          </div>

          {/* Pits */}
          <div className="flex-1 flex flex-col gap-2 md:gap-3">
            {/* Player 2 Pits (Top) - reversed: 12, 11, 10, 9, 8, 7 */}
            <div className="grid grid-cols-6 gap-1.5 md:gap-2">
              {[12, 11, 10, 9, 8, 7].map((pit) => (
                <button
                  key={pit}
                  onClick={() => currentPlayer === 2 && !gameOver && handlePlayerMove(pit)}
                  disabled={currentPlayer !== 2 || gameOver || aiThinking}
                  className={`aspect-square rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                    currentPlayer === 2 && !gameOver && board[pit] > 0
                      ? 'bg-amber-950/60 border-blue-400/60 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-400/20 hover:scale-105 cursor-pointer'
                      : lastMove === pit
                      ? 'bg-amber-950/40 border-blue-500/40 shadow-inner'
                      : 'bg-amber-950/60 border-amber-800/30'
                  }`}
                >
                  <StonePile count={board[pit]} />
                </button>
              ))}
            </div>

            {/* Player 1 Pits (Bottom) - 0, 1, 2, 3, 4, 5 */}
            <div className="grid grid-cols-6 gap-1.5 md:gap-2">
              {[0, 1, 2, 3, 4, 5].map((pit) => {
                const isValid = validMoves.includes(pit);
                return (
                  <button
                    key={pit}
                    onClick={() => handlePlayerMove(pit)}
                    disabled={!isValid || gameOver || aiThinking}
                    className={`aspect-square rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                      isValid
                        ? 'bg-amber-950/60 border-green-400/60 hover:border-green-300 hover:shadow-lg hover:shadow-green-400/20 hover:scale-105 cursor-pointer animate-pulse-subtle'
                        : lastMove === pit
                        ? 'bg-amber-950/40 border-green-500/40 shadow-inner'
                        : 'bg-amber-950/60 border-amber-800/30'
                    }`}
                  >
                    <StonePile count={board[pit]} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player 2 Store (Right) */}
          <div className="flex flex-col justify-center">
            <div className={`w-16 h-48 md:w-20 md:h-56 bg-amber-950/60 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              currentPlayer === 2 && !gameOver ? 'border-blue-400 shadow-lg shadow-blue-400/20' : 'border-amber-800/50'
            }`}>
              <StonePile count={board[13]} size="large" />
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty indicator */}
      <div className="mt-4 text-amber-200/60 text-sm">
        難易度: {difficulty === 'easy' ? '🌱 簡単' : difficulty === 'medium' ? '🌿 普通' : '🌳 難しい'}
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-amber-800 to-amber-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-amber-600/50 animate-bounce-in">
            <div className="text-6xl mb-4">
              {winner === 1 ? '🎉' : winner === 2 ? '🤖' : '🤝'}
            </div>
            <h2 className="text-2xl font-bold text-amber-100 mb-2">
              {winner === 1 ? 'おめでとうございます！' : winner === 2 ? 'AIの勝利' : '引き分け'}
            </h2>
            <p className="text-amber-200/80 mb-2">
              最終スコア
            </p>
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-300">{board[6]}</div>
                <div className="text-amber-200/60 text-sm">あなた</div>
              </div>
              <div className="text-amber-400 text-2xl font-bold self-center">vs</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-300">{board[13]}</div>
                <div className="text-amber-200/60 text-sm">AI</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetGame}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 px-6 py-3 rounded-xl font-bold hover:from-amber-400 hover:to-yellow-400 transition-all"
              >
                もう一度 🔄
              </button>
              <button
                onClick={() => setGameStarted(false)}
                className="flex-1 bg-amber-700/50 text-amber-100 px-6 py-3 rounded-xl font-bold hover:bg-amber-600/50 transition-all"
              >
                設定変更 ⚙️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
