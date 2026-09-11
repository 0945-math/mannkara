import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Board,
  Player,
  createInitialBoard,
  makeMove,
  isGameOver,
  getFinalBoard,
  getWinner,
  getValidMoves,
  isValidMove,
  getPlayerPits,
  AIMoveInfo,
  getHint,
} from './game/mancala';
import { getBestMoveMCTS } from './game/mcts';
import { soundEngine } from './game/sound';
import StartScreen from './components/StartScreen';
import GameBoard from './components/GameBoard';
import GameOverModal from './components/GameOverModal';

type Difficulty = 'easy' | 'medium' | 'hard';

function getAIDepth(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 10; // 1000回シミュレーション
    case 'medium': return 30; // 3000回シミュレーション
    case 'hard': return 80; // 8000回シミュレーション
  }
}

interface GameStats {
  moveCount: number;
  captures: number;
  extraTurns: number;
  wins: number;
  losses: number;
  draws: number;
}

export default function App() {
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | 0 | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [aiThinking, setAiThinking] = useState(false);
  const [message, setMessage] = useState('あなたの番です。穴を選んでください。');
  const [gameStarted, setGameStarted] = useState(false);
  const [stats, setStats] = useState<GameStats>({ moveCount: 0, captures: 0, extraTurns: 0, wins: 0, losses: 0, draws: 0 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [aiInfo, setAiInfo] = useState<AIMoveInfo | null>(null);
  const [showAiHint, setShowAiHint] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hintPit, setHintPit] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [thinkingDots, setThinkingDots] = useState(0);

  useEffect(() => {
    soundEngine.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (!aiThinking) return;
    const interval = setInterval(() => {
      setThinkingDots(d => (d + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, [aiThinking]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const interval = setInterval(() => {
      setGameTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setCurrentPlayer(1);
    setGameOver(false);
    setWinner(null);
    setAiThinking(false);
    setMessage('あなたの番です。穴を選んでください。');
    setGameStarted(true);
    setAiInfo(null);
    setAnimating(false);
    setShowConfetti(false);
    setHintPit(null);
    setGameTime(0);
    setShowHint(false);
  }, []);

  const executeMove = useCallback((pit: number, player: Player) => {
    setAnimating(true);
    setHintPit(null);

    const result = makeMove(board, pit, player);

    // Animate sowing
    let i = 0;
    const animateSowing = () => {
      if (i < result.sowingSteps.length) {
        const step = result.sowingSteps[i];
        setBoard(step.boardAfter);
        soundEngine.playStoneDrop();
        i++;
        setTimeout(animateSowing, 50);
      } else {
        setTimeout(() => {
          setBoard(result.newBoard);

          if (result.captured && result.capturedPit !== null) {
            soundEngine.playCapture();
            setStats(prev => ({ ...prev, captures: prev.captures + 1 }));
          }

          if (result.extraTurn) {
            soundEngine.playExtraTurn();
            setStats(prev => ({ ...prev, extraTurns: prev.extraTurns + 1 }));
          }

          if (isGameOver(result.newBoard)) {
            const finalBoard = getFinalBoard(result.newBoard);
            setBoard(finalBoard);
            setGameOver(true);
            const w = getWinner(finalBoard);
            setWinner(w);
            setStats(prev => ({
              ...prev,
              wins: prev.wins + (w === 1 ? 1 : 0),
              losses: prev.losses + (w === 2 ? 1 : 0),
              draws: prev.draws + (w === 0 ? 1 : 0),
            }));
            soundEngine.playGameOver(w === 1);
            if (w === 1) {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 6000);
            }
            setMessage(w === 1 ? '🎉 おめでとうございます！あなたの勝ちです！' :
                       w === 2 ? '🤖 AIの勝利...また挑戦しましょう！' : '🤝 引き分けです！');
            setAnimating(false);
            return;
          }

          if (result.extraTurn) {
            setCurrentPlayer(player);
            setMessage(player === 1 ? '✨ ボーナスターン！もう一度どうぞ！' : '🤖✨ AIにボーナスターン！');
          } else {
            const next = player === 1 ? 2 : 1;
            setCurrentPlayer(next);
            setMessage(next === 1 ? 'あなたの番です。穴を選んでください。' : '🤖 AIが考えています...');
          }
          setAnimating(false);
        }, 100);
      }
    };
    animateSowing();
  }, [board]);

  const handlePlayerMove = useCallback((pit: number) => {
    if (gameOver || currentPlayer !== 1 || aiThinking || animating) return;
    if (!isValidMove(board, pit, 1)) return;

    soundEngine.playClick();
    setStats(prev => ({ ...prev, moveCount: prev.moveCount + 1 }));
    executeMove(pit, 1);
  }, [board, currentPlayer, gameOver, aiThinking, animating, executeMove]);

  const handleShowHint = useCallback(() => {
    if (currentPlayer !== 1 || gameOver || aiThinking || animating) return;
    const hint = getHint(board);
    if (hint) {
      setHintPit(hint.pit);
      setShowHint(true);
      soundEngine.playHint();
      setTimeout(() => setShowHint(false), 3000);
    }
  }, [board, currentPlayer, gameOver, aiThinking, animating]);

  useEffect(() => {
    if (currentPlayer === 2 && !gameOver && gameStarted && !animating) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        const iterations = getAIDepth(difficulty) * 100; // 探索回数を設定
        const info = getBestMoveMCTS(board, 2, iterations);
        setAiInfo(info);

        if (info.move === -1) {
          setAiThinking(false);
          return;
        }

        executeMove(info.move, 2);
        setAiThinking(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameOver, board, difficulty, gameStarted, animating, executeMove]);

  const validMoves = useMemo(() => 
    currentPlayer === 1 && !gameOver && !aiThinking && !animating ? getValidMoves(board, 1) : [],
    [board, currentPlayer, gameOver, aiThinking, animating]
  );

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver || currentPlayer !== 1 || aiThinking || animating) return;
      
      const key = parseInt(e.key);
      if (key >= 1 && key <= 6) {
        const pit = key - 1;
        if (validMoves.includes(pit)) {
          handlePlayerMove(pit);
        }
      } else if (e.key === 'h' || e.key === 'H') {
        handleShowHint();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver, currentPlayer, aiThinking, animating, validMoves, handlePlayerMove, handleShowHint]);

  if (!gameStarted) {
    return (
      <StartScreen
        onStart={resetGame}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-zinc-900 to-stone-950 flex flex-col items-center relative overflow-hidden select-none">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.04] rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-600/[0.04] rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 w-full max-w-5xl px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-xl shadow-amber-500/30 transform hover:scale-110 transition-transform duration-300">
              <span className="text-2xl">🏺</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight leading-none">マンカラ</h1>
              <p className="text-amber-500/40 text-[10px] tracking-[0.2em] font-medium">MANCALA • AI BATTLE</p>
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <div className="text-sm text-amber-400/60 font-mono mr-2 bg-white/5 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              ⏱️ {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
            </div>
            <button
              onClick={handleShowHint}
              disabled={currentPlayer !== 1 || gameOver || aiThinking || animating}
              className="w-9 h-9 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-200/60 hover:text-amber-200 transition-all flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm"
              title="ヒント (H)"
            >
              💡
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center text-sm backdrop-blur-sm ${soundEnabled ? 'bg-white/5 text-amber-200/60 hover:bg-white/10' : 'bg-white/5 text-amber-200/30 hover:bg-white/10'}`}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button
              onClick={resetGame}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-200 text-xs font-bold transition-all border border-amber-500/20 backdrop-blur-sm"
            >
              🔄 新規
            </button>
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="relative z-10 w-full max-w-5xl px-4 mb-2">
        <div className="flex items-center gap-3">
          <div className={`flex-1 rounded-xl p-3 transition-all duration-500 backdrop-blur-sm ${
            currentPlayer === 1 && !gameOver
              ? 'bg-gradient-to-br from-green-500/20 to-green-600/15 border border-green-500/40 shadow-lg shadow-green-500/15'
              : 'bg-white/[0.03] border border-white/10'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                currentPlayer === 1 && !gameOver ? 'bg-green-500/25 ring-2 ring-green-400/50' : 'bg-white/10'
              }`}>
                👤
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-amber-400/50 font-semibold">あなた</div>
                <div className="text-3xl font-black text-green-400 leading-none">{board[6]}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-amber-400/40">{board[6] + getPlayerPits(1).reduce((s, p) => s + board[p], 0)}/36</div>
                <div className="text-sm text-amber-300/50 font-bold">{Math.round((board[6] / 36) * 100)}%</div>
              </div>
            </div>
          </div>

          <div className="text-amber-600/30 text-sm font-black">VS</div>

          <div className={`flex-1 rounded-xl p-3 transition-all duration-500 backdrop-blur-sm ${
            currentPlayer === 2 && !gameOver
              ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/15 border border-blue-500/40 shadow-lg shadow-blue-500/15'
              : 'bg-white/[0.03] border border-white/10'
          }`}>
            <div className="flex items-center gap-2">
              <div className="text-right flex-1">
                <div className="text-[10px] text-amber-400/50 font-semibold">AI</div>
                <div className="text-3xl font-black text-blue-400 leading-none">{board[13]}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-amber-400/40">{board[13] + getPlayerPits(2).reduce((s, p) => s + board[p], 0)}/36</div>
                <div className="text-sm text-amber-300/50 font-bold">{Math.round((board[13] / 36) * 100)}%</div>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                currentPlayer === 2 && !gameOver ? 'bg-blue-500/25 ring-2 ring-blue-400/50' : 'bg-white/10'
              }`}>
                🤖
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Bar */}
      <div className="relative z-10 w-full max-w-5xl px-4 mb-3">
        <div className={`rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-all duration-300 backdrop-blur-sm ${
          gameOver
            ? winner === 1 ? 'bg-gradient-to-r from-green-500/20 to-green-600/15 text-green-300 border border-green-500/40' :
              winner === 2 ? 'bg-gradient-to-r from-red-500/20 to-red-600/15 text-red-300 border border-red-500/40' :
              'bg-gradient-to-r from-yellow-500/20 to-yellow-600/15 text-yellow-300 border border-yellow-500/40'
            : showHint
            ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/15 text-purple-300 border border-purple-500/40'
            : aiThinking
            ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/15 text-blue-300 border border-blue-500/40'
            : 'bg-white/[0.03] text-amber-200/70 border border-white/10'
        }`}>
          {showHint && hintPit !== null ? (
            <span>💡 ヒント: 穴 {hintPit + 1} がおすすめです！</span>
          ) : aiThinking ? (
            <span>🤖 AI思考中{'.'.repeat(thinkingDots)}{' '.repeat(3 - thinkingDots)}</span>
          ) : message}
        </div>
      </div>

      {/* Game Board */}
      <GameBoard
        board={board}
        currentPlayer={currentPlayer}
        gameOver={gameOver}
        aiThinking={aiThinking}
        animating={animating}
        validMoves={validMoves}
        hintPit={hintPit}
        showHint={showHint}
        onPitClick={handlePlayerMove}
      />

      {/* AI Analysis */}
      {showAiHint && aiInfo && aiInfo.allScores.length > 0 && (
        <div className="relative z-10 w-full max-w-5xl px-4 mt-3 animate-fade-in">
          <div className="bg-blue-950/40 backdrop-blur-md rounded-xl p-3 border border-blue-800/25">
            <div className="text-[10px] text-blue-400/60 mb-1.5 font-semibold tracking-wider">🧠 AI EVALUATION</div>
            <div className="flex gap-1.5 flex-wrap">
              {aiInfo.allScores.sort((a, b) => b.score - a.score).map(({ move, score }, idx) => (
                <div key={move} className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 backdrop-blur-sm ${
                  idx === 0 ? 'bg-blue-500/25 text-blue-200 font-bold ring-1 ring-blue-500/40' : 'bg-white/[0.03] text-amber-300/40'
                }`}>
                  <span className="text-[10px] opacity-50">#{idx + 1}</span>
                  <span>穴{move + 1}</span>
                  <span className={`font-mono ${score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {score > 0 ? '+' : ''}{score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="relative z-10 w-full max-w-5xl px-4 mt-3 pb-4">
        {!gameOver && currentPlayer === 1 && (
          <div className="text-center mb-2 text-[10px] text-amber-400/30">
            💡 キーボード: 1-6 で穴を選択、H でヒント
          </div>
        )}
        
        <div className="flex gap-2 justify-center flex-wrap">
          <div className="bg-white/[0.03] backdrop-blur-sm px-3 py-1.5 rounded-lg text-[10px] text-amber-300/40 border border-white/[0.05]">
            🎯 手数 <span className="text-amber-200/80 font-bold">{stats.moveCount}</span>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm px-3 py-1.5 rounded-lg text-[10px] text-amber-300/40 border border-white/[0.05]">
            💎 <span className="text-yellow-300/80 font-bold">{stats.captures}</span>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm px-3 py-1.5 rounded-lg text-[10px] text-amber-300/40 border border-white/[0.05]">
            ✨ <span className="text-green-300/80 font-bold">{stats.extraTurns}</span>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm px-3 py-1.5 rounded-lg text-[10px] text-amber-300/40 border border-white/[0.05]">
            🏆 <span className="text-green-300/80 font-bold">{stats.wins}</span>
            <span className="text-amber-400/30 mx-0.5">/</span>
            <span className="text-red-300/80 font-bold">{stats.losses}</span>
            <span className="text-amber-400/30 mx-0.5">/</span>
            <span className="text-yellow-300/80 font-bold">{stats.draws}</span>
          </div>
          <button
            onClick={() => setShowAiHint(!showAiHint)}
            className={`px-3 py-1.5 backdrop-blur-sm rounded-lg text-[10px] border transition-all ${
              showAiHint ? 'bg-blue-500/20 text-blue-300/80 border-blue-500/40' : 'bg-white/[0.03] text-amber-300/40 border-white/[0.05] hover:bg-white/[0.05]'
            }`}
          >
            🧠 AI解析
          </button>
          <div className="bg-white/[0.03] backdrop-blur-sm px-3 py-1.5 rounded-lg text-[10px] text-amber-300/40 border border-white/[0.05]">
            {difficulty === 'easy' ? '🌱' : difficulty === 'medium' ? '🌿' : '🌳'} {difficulty === 'easy' ? '簡単' : difficulty === 'medium' ? '普通' : '難しい'}
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <GameOverModal
          winner={winner}
          board={board}
          stats={stats}
          gameTime={gameTime}
          onRestart={resetGame}
          onSettings={() => { setGameStarted(false); setGameOver(false); }}
        />
      )}

      {/* Confetti */}
      {showConfetti && <Confetti />}
    </div>
  );
}

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#fbbf24', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#ec4899'];
    const pieces = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 5 + 4,
      size: Math.random() * 12 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.4,
    }));

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });

      if (pieces.some(p => p.y < canvas.height + 50)) {
        animId = requestAnimationFrame(animate);
      }
    };
    animate();

    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[60]" />;
}
