import { useState, useCallback, useEffect, useRef } from 'react';
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
  getPlayerPits,
  AIMoveInfo,
} from './game/mancala';
import { soundEngine } from './game/sound';
import StartScreen from './components/StartScreen';

type Difficulty = 'easy' | 'medium' | 'hard';

function getAIDepth(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 2;
    case 'medium': return 5;
    case 'hard': return 7;
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

interface MoveRecord {
  player: Player;
  pit: number;
  captured: boolean;
  extraTurn: boolean;
  boardAfter: Board;
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
  const [capturedPits, setCapturedPits] = useState<Set<number>>(new Set());
  const [sowingAnim, setSowingAnim] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<GameStats>({ moveCount: 0, captures: 0, extraTurns: 0, wins: 0, losses: 0, draws: 0 });
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [aiInfo, setAiInfo] = useState<AIMoveInfo | null>(null);
  const [showAiHint, setShowAiHint] = useState(false);
  const [hoveredPit, setHoveredPit] = useState<number | null>(null);
  const [shakeBoard, setShakeBoard] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    soundEngine.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setCurrentPlayer(1);
    setGameOver(false);
    setWinner(null);
    setAiThinking(false);
    setLastMove(null);
    setMessage('あなたの番です。穴を選んでください。');
    setGameStarted(true);
    setCapturedPits(new Set());
    setSowingAnim(new Set());
    setMoveHistory([]);
    setAiInfo(null);
    setHoveredPit(null);
  }, []);

  const animateSowing = useCallback((path: number[], callback: () => void) => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < path.length) {
        setSowingAnim(prev => new Set(prev).add(path[i]));
        soundEngine.playStoneDrop();
        i++;
      } else {
        clearInterval(interval);
        setSowingAnim(new Set());
        callback();
      }
    }, 80);
  }, []);

  const handlePlayerMove = useCallback((pit: number) => {
    if (gameOver || currentPlayer !== 1 || aiThinking) return;
    if (!isValidMove(board, pit, 1)) return;

    soundEngine.playClick();
    const result = makeMove(board, pit, 1);

    // Record move
    setMoveHistory(prev => [...prev, {
      player: 1,
      pit,
      captured: result.captured,
      extraTurn: result.extraTurn,
      boardAfter: [...result.newBoard],
    }]);

    setStats(prev => ({
      ...prev,
      moveCount: prev.moveCount + 1,
      captures: prev.captures + (result.captured ? 1 : 0),
      extraTurns: prev.extraTurns + (result.extraTurn ? 1 : 0),
    }));

    // Animate sowing
    setLastMove(pit);
    animateSowing(result.sowingPath, () => {
      setBoard(result.newBoard);

      if (result.captured && result.capturedPit !== null) {
        setCapturedPits(new Set([result.capturedPit]));
        soundEngine.playCapture();
        setShakeBoard(true);
        setTimeout(() => {
          setCapturedPits(new Set());
          setShakeBoard(false);
        }, 600);
      }

      if (result.extraTurn) {
        soundEngine.playExtraTurn();
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
        setMessage(w === 1 ? '🎉 おめでとうございます！あなたの勝ちです！' :
                   w === 2 ? '🤖 AIの勝利...また挑戦しましょう！' : '🤝 引き分けです！');
        return;
      }

      if (result.extraTurn) {
        setCurrentPlayer(1);
        setMessage('✨ ボーナスターン！もう一度どうぞ！');
      } else {
        setCurrentPlayer(2);
        setMessage('🤖 AIが考えています...');
      }
    });
  }, [board, currentPlayer, gameOver, aiThinking, animateSowing]);

  // AI Move
  useEffect(() => {
    if (currentPlayer === 2 && !gameOver && gameStarted) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        const info = getBestMove(board, 2, getAIDepth(difficulty));
        setAiInfo(info);

        if (info.move === -1) return;

        const result = makeMove(board, info.move, 2);

        setMoveHistory(prev => [...prev, {
          player: 2,
          pit: info.move,
          captured: result.captured,
          extraTurn: result.extraTurn,
          boardAfter: [...result.newBoard],
        }]);

        setLastMove(info.move);
        animateSowing(result.sowingPath, () => {
          setBoard(result.newBoard);

          if (result.captured && result.capturedPit !== null) {
            setCapturedPits(new Set([result.capturedPit]));
            soundEngine.playCapture();
            setShakeBoard(true);
            setTimeout(() => {
              setCapturedPits(new Set());
              setShakeBoard(false);
            }, 600);
          }

          if (result.extraTurn) {
            soundEngine.playExtraTurn();
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
            setMessage(w === 1 ? '🎉 おめでとうございます！あなたの勝ちです！' :
                       w === 2 ? '🤖 AIの勝利...また挑戦しましょう！' : '🤝 引き分けです！');
          } else if (result.extraTurn) {
            setCurrentPlayer(2);
            setMessage('🤖✨ AIにボーナスターン！');
          } else {
            setCurrentPlayer(1);
            setMessage('あなたの番です。穴を選んでください。');
          }
          setAiThinking(false);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameOver, board, difficulty, gameStarted, animateSowing]);

  const validMoves = currentPlayer === 1 && !gameOver && !aiThinking ? getValidMoves(board, 1) : [];

  if (!gameStarted) {
    return (
      <StartScreen
        onStart={resetGame}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
      />
    );
  }

  const totalStones = 48;
  const p1Total = board[6] + getPlayerPits(1).reduce((s, p) => s + board[p], 0);
  const p2Total = board[13] + getPlayerPits(2).reduce((s, p) => s + board[p], 0);
  const p1Percent = Math.round((board[6] / totalStones) * 100);
  const p2Percent = Math.round((board[13] / totalStones) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-amber-950 flex flex-col items-center p-3 md:p-6 relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(217,119,6,0.3) 35px, rgba(217,119,6,0.3) 36px),
            repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(120,53,15,0.2) 35px, rgba(120,53,15,0.2) 36px)
          `,
        }} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(217,119,6,0.08)_0%,_transparent_60%)]" />

      {/* Header */}
      <div className="relative z-10 w-full max-w-5xl mb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏺</span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-amber-100 tracking-tight">マンカラ</h1>
              <p className="text-amber-400/50 text-xs">
                {difficulty === 'easy' ? '🌱 簡単' : difficulty === 'medium' ? '🌿 普通' : '🌳 難しい'}
                {' • '}手数: {stats.moveCount}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-all ${soundEnabled ? 'bg-amber-700/40 text-amber-200' : 'bg-stone-800/40 text-stone-500'}`}
              title={soundEnabled ? 'サウンドON' : 'サウンドOFF'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-lg bg-amber-700/40 text-amber-200 hover:bg-amber-600/40 transition-all"
              title="履歴"
            >
              📋
            </button>
            <button
              onClick={resetGame}
              className="px-3 py-2 rounded-lg bg-amber-700/40 hover:bg-amber-600/40 text-amber-100 text-sm font-medium transition-all"
            >
              🔄 新規
            </button>
            <button
              onClick={() => setGameStarted(false)}
              className="px-3 py-2 rounded-lg bg-stone-800/40 hover:bg-stone-700/40 text-stone-300 text-sm font-medium transition-all"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* Score Bar */}
      <div className="relative z-10 w-full max-w-5xl mb-3">
        <div className="bg-gradient-to-r from-amber-950/70 via-amber-900/50 to-amber-950/70 backdrop-blur-sm rounded-xl p-3 border border-amber-800/20 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-900/40 flex items-center justify-center border border-green-500/30">
                <span className="text-sm">👤</span>
              </div>
              <div>
                <div className="text-amber-200/60 text-[10px] font-semibold">あなた</div>
                <span className="text-xl font-black text-green-400 leading-none">{board[6]}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-500/30 text-xs font-mono">
              <span>{p1Total}</span>
              <span>/</span>
              <span>{totalStones}</span>
              <span>/</span>
              <span>{p2Total}</span>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <div className="text-amber-200/60 text-[10px] font-semibold text-right">AI</div>
                <span className="text-xl font-black text-blue-400 leading-none">{board[13]}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center border border-blue-500/30">
                <span className="text-sm">🤖</span>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2.5 bg-stone-800/80 rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-gradient-to-r from-green-600 to-green-400 transition-all duration-700 ease-out relative"
              style={{ width: `${p1Percent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
            </div>
            <div className="flex-1 bg-stone-700/50" />
            <div
              className="bg-gradient-to-l from-blue-600 to-blue-400 transition-all duration-700 ease-out relative"
              style={{ width: `${p2Percent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      <div className={`relative z-10 mb-3 px-5 py-2.5 rounded-xl text-center font-medium transition-all duration-300 ${
        gameOver
          ? winner === 1 ? 'bg-green-500/15 text-green-200 border border-green-500/30 shadow-lg shadow-green-500/10' :
            winner === 2 ? 'bg-red-500/15 text-red-200 border border-red-500/30 shadow-lg shadow-red-500/10' :
            'bg-yellow-500/15 text-yellow-200 border border-yellow-500/30'
          : aiThinking
          ? 'bg-blue-500/15 text-blue-200 border border-blue-500/30'
          : 'bg-amber-900/40 text-amber-100 border border-amber-700/30'
      }`}>
        {aiThinking && (
          <span className="inline-block mr-2">
            <span className="animate-spin inline-block">⚙️</span>
          </span>
        )}
        {message}
      </div>

      {/* Game Board */}
      <div
        ref={boardRef}
        className={`relative z-10 w-full max-w-5xl transition-transform ${shakeBoard ? 'animate-shake' : ''}`}
      >
        <div className="relative bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 rounded-[2rem] p-4 md:p-6 shadow-2xl border-2 border-amber-700/30 overflow-hidden">
          {/* Wood grain texture overlay */}
          <div className="absolute inset-0 rounded-[2rem] opacity-[0.08] pointer-events-none" style={{
            backgroundImage: `
              repeating-linear-gradient(87deg, transparent, transparent 18px, rgba(120,53,15,0.4) 18px, rgba(120,53,15,0.4) 19px),
              repeating-linear-gradient(92deg, transparent, transparent 30px, rgba(180,83,9,0.2) 30px, rgba(180,83,9,0.2) 31px),
              repeating-linear-gradient(85deg, transparent, transparent 50px, rgba(120,53,15,0.15) 50px, rgba(120,53,15,0.15) 51px)
            `,
          }} />
          {/* Subtle radial highlight */}
          <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,_rgba(251,191,36,0.05)_0%,_transparent_70%)] pointer-events-none" />
          {/* Inner shadow */}
          <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_2px_20px_rgba(0,0,0,0.3)] pointer-events-none" />
          {/* Top edge highlight */}
          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent pointer-events-none" />

          <div className="relative flex items-stretch gap-2 md:gap-4">
            {/* Player 1 Store (Left) */}
            <div className="flex flex-col justify-center">
              <div className={`relative w-14 h-44 md:w-20 md:h-60 rounded-[40%] flex items-center justify-center transition-all duration-500 ${
                currentPlayer === 1 && !gameOver
                  ? 'bg-gradient-to-b from-green-900/70 to-green-950/80 border-2 border-green-400/50 shadow-lg shadow-green-500/20'
                  : 'bg-gradient-to-b from-amber-950/80 to-stone-950/80 border-2 border-amber-800/30'
              }`} style={{
                boxShadow: currentPlayer === 1 && !gameOver
                  ? 'inset 0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(74,222,128,0.15)'
                  : 'inset 0 4px 16px rgba(0,0,0,0.4)',
              }}>
                <div className="absolute inset-2 rounded-[40%] bg-black/20" />
                <div className="absolute inset-[20%] rounded-full bg-gradient-to-b from-white/[0.03] to-transparent" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="text-3xl md:text-4xl font-black text-green-300 drop-shadow-lg">{board[6]}</div>
                  <div className="text-[10px] text-green-300/50 mt-1 font-bold tracking-wider">YOU</div>
                </div>
              </div>
            </div>

            {/* Pits */}
            <div className="flex-1 flex flex-col gap-2 md:gap-3">
              {/* Player 2 Pits (Top) */}
              <div className="grid grid-cols-6 gap-1.5 md:gap-2.5">
                {[12, 11, 10, 9, 8, 7].map((pit) => (
                  <PitCell
                    key={pit}
                    pit={pit}
                    count={board[pit]}
                    isPlayerPit={currentPlayer === 2 && !gameOver}
                    isValid={currentPlayer === 2 && !gameOver && board[pit] > 0}
                    isLastMove={lastMove === pit}
                    isSowing={sowingAnim.has(pit)}
                    isCaptured={capturedPits.has(pit)}
                    isHovered={hoveredPit === pit}
                    onClick={() => currentPlayer === 2 && !gameOver && handlePlayerMove(pit)}
                    onHover={(h) => setHoveredPit(h ? pit : null)}
                    color="blue"
                  />
                ))}
              </div>

              {/* Player 1 Pits (Bottom) */}
              <div className="grid grid-cols-6 gap-1.5 md:gap-2.5">
                {[0, 1, 2, 3, 4, 5].map((pit) => {
                  const isValid = validMoves.includes(pit);
                  return (
                    <PitCell
                      key={pit}
                      pit={pit}
                      count={board[pit]}
                      isPlayerPit={currentPlayer === 1 && !gameOver}
                      isValid={isValid}
                      isLastMove={lastMove === pit}
                      isSowing={sowingAnim.has(pit)}
                      isCaptured={capturedPits.has(pit)}
                      isHovered={hoveredPit === pit}
                      onClick={() => handlePlayerMove(pit)}
                      onHover={(h) => setHoveredPit(h ? pit : null)}
                      color="green"
                    />
                  );
                })}
              </div>
            </div>

            {/* Player 2 Store (Right) */}
            <div className="flex flex-col justify-center">
              <div className={`relative w-14 h-44 md:w-20 md:h-60 rounded-[40%] flex items-center justify-center transition-all duration-500 ${
                currentPlayer === 2 && !gameOver
                  ? 'bg-gradient-to-b from-blue-900/70 to-blue-950/80 border-2 border-blue-400/50 shadow-lg shadow-blue-500/20'
                  : 'bg-gradient-to-b from-amber-950/80 to-stone-950/80 border-2 border-amber-800/30'
              }`} style={{
                boxShadow: currentPlayer === 2 && !gameOver
                  ? 'inset 0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(96,165,250,0.15)'
                  : 'inset 0 4px 16px rgba(0,0,0,0.4)',
              }}>
                <div className="absolute inset-2 rounded-[40%] bg-black/20" />
                <div className="absolute inset-[20%] rounded-full bg-gradient-to-b from-white/[0.03] to-transparent" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="text-3xl md:text-4xl font-black text-blue-300 drop-shadow-lg">{board[13]}</div>
                  <div className="text-[10px] text-blue-300/50 mt-1 font-bold tracking-wider">AI</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Thinking Info */}
      {showAiHint && aiInfo && aiInfo.allScores.length > 0 && (
        <div className="relative z-10 mt-3 w-full max-w-5xl">
          <div className="bg-blue-950/40 backdrop-blur rounded-xl p-3 border border-blue-800/30">
            <div className="text-xs text-blue-300/70 mb-2">🤖 AI評価（直前の手）:</div>
            <div className="flex gap-2 flex-wrap">
              {aiInfo.allScores.map(({ move, score }) => (
                <div key={move} className={`px-2 py-1 rounded text-xs ${
                  move === aiInfo.move ? 'bg-blue-500/30 text-blue-200 font-bold' : 'bg-stone-800/40 text-stone-400'
                }`}>
                  穴{move + 1}: {score > 0 ? '+' : ''}{score.toFixed(1)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="relative z-10 mt-3 w-full max-w-5xl">
        <div className="flex gap-2 justify-center flex-wrap text-xs">
          <div className="bg-amber-900/30 px-3 py-1.5 rounded-lg text-amber-300/70 border border-amber-800/20">
            🎯 手数: <span className="font-bold text-amber-200">{stats.moveCount}</span>
          </div>
          <div className="bg-amber-900/30 px-3 py-1.5 rounded-lg text-amber-300/70 border border-amber-800/20">
            💎 キャプチャ: <span className="font-bold text-yellow-300">{stats.captures}</span>
          </div>
          <div className="bg-amber-900/30 px-3 py-1.5 rounded-lg text-amber-300/70 border border-amber-800/20">
            ✨ ボーナス: <span className="font-bold text-green-300">{stats.extraTurns}</span>
          </div>
          <div className="bg-amber-900/30 px-3 py-1.5 rounded-lg text-amber-300/70 border border-amber-800/20">
            🏆 戦績: <span className="text-green-300">{stats.wins}勝</span>
            <span className="text-stone-400"> / </span>
            <span className="text-red-300">{stats.losses}敗</span>
            <span className="text-stone-400"> / </span>
            <span className="text-yellow-300">{stats.draws}引</span>
          </div>
          <button
            onClick={() => setShowAiHint(!showAiHint)}
            className="bg-blue-900/30 px-3 py-1.5 rounded-lg text-blue-300/70 border border-blue-800/20 hover:bg-blue-800/30 transition-colors"
          >
            🧠 AI解析 {showAiHint ? 'OFF' : 'ON'}
          </button>
        </div>
      </div>

      {/* Move History Panel */}
      {showHistory && (
        <div className="relative z-10 mt-3 w-full max-w-5xl">
          <div className="bg-amber-950/60 backdrop-blur rounded-xl p-4 border border-amber-800/30 max-h-48 overflow-y-auto">
            <h3 className="text-amber-200 font-bold text-sm mb-2">📋 手数の履歴</h3>
            {moveHistory.length === 0 ? (
              <p className="text-amber-400/50 text-sm">まだ手がありません</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                {moveHistory.map((m, i) => (
                  <div key={i} className={`text-xs px-2 py-1.5 rounded ${
                    m.player === 1 ? 'bg-green-900/20 text-green-300/80' : 'bg-blue-900/20 text-blue-300/80'
                  }`}>
                    <span className="font-bold">{i + 1}.</span>
                    {m.player === 1 ? '👤' : '🤖'} 穴{m.pit + 1}
                    {m.captured && ' 💎'}
                    {m.extraTurn && ' ✨'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative bg-gradient-to-b from-amber-800/95 to-amber-950/95 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-amber-600/20 animate-scale-in overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 50% 0%, rgba(251,191,36,0.3) 0%, transparent 50%)`,
              }} />
            </div>

            <div className="relative">
              <div className="text-7xl mb-4 animate-bounce-slow">
                {winner === 1 ? '🎉' : winner === 2 ? '🤖' : '🤝'}
              </div>
              <h2 className="text-3xl font-black text-amber-100 mb-2">
                {winner === 1 ? '勝利！' : winner === 2 ? 'AIの勝利' : '引き分け'}
              </h2>
              <p className="text-amber-300/60 mb-6">
                {winner === 1 ? '素晴らしいプレイでした！' : winner === 2 ? '惜しかった！もう一度挑戦しましょう' : '互角の戦いでした！'}
              </p>

              {/* Final Score */}
              <div className="flex justify-center gap-6 mb-6">
                <div className="text-center bg-green-900/20 rounded-xl p-4 border border-green-500/20 min-w-[100px]">
                  <div className="text-4xl font-black text-green-400 drop-shadow-lg">{board[6]}</div>
                  <div className="text-amber-200/60 text-sm mt-1">あなた 👤</div>
                </div>
                <div className="text-amber-500/30 text-2xl font-bold self-center">VS</div>
                <div className="text-center bg-blue-900/20 rounded-xl p-4 border border-blue-500/20 min-w-[100px]">
                  <div className="text-4xl font-black text-blue-400 drop-shadow-lg">{board[13]}</div>
                  <div className="text-amber-200/60 text-sm mt-1">AI 🤖</div>
                </div>
              </div>

              {/* Game Stats Summary */}
              <div className="bg-amber-950/40 rounded-xl p-4 mb-6 border border-amber-800/20">
                <div className="text-xs text-amber-400/50 mb-2 font-semibold">📊 ゲーム統計</div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-amber-200/70">
                    <div className="text-lg font-bold text-amber-200">{stats.moveCount}</div>
                    <div className="text-xs">手数</div>
                  </div>
                  <div className="text-amber-200/70">
                    <div className="text-lg font-bold text-yellow-300">{stats.captures}</div>
                    <div className="text-xs">キャプチャ</div>
                  </div>
                  <div className="text-amber-200/70">
                    <div className="text-lg font-bold text-green-300">{stats.extraTurns}</div>
                    <div className="text-xs">ボーナス</div>
                  </div>
                </div>
              </div>

              {/* Win/Loss record */}
              {(stats.wins + stats.losses + stats.draws) > 0 && (
                <div className="text-xs text-amber-400/40 mb-4">
                  通算戦績: {stats.wins}勝 {stats.losses}敗 {stats.draws}分
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={resetGame}
                  className="flex-1 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-yellow-500 group-hover:from-amber-400 group-hover:to-yellow-400 transition-all" />
                  <div className="relative px-6 py-3.5 font-black text-lg text-amber-950">
                    もう一度 🔄
                  </div>
                </button>
                <button
                  onClick={() => setGameStarted(false)}
                  className="flex-1 bg-amber-800/30 text-amber-200 px-6 py-3.5 rounded-xl font-bold hover:bg-amber-700/30 transition-all border border-amber-700/20"
                >
                  設定 ⚙️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Pit Cell Component
function PitCell({ pit, count, isPlayerPit, isValid, isLastMove, isSowing, isCaptured, isHovered, onClick, onHover, color }: {
  pit: number;
  count: number;
  isPlayerPit: boolean;
  isValid: boolean;
  isLastMove: boolean;
  isSowing: boolean;
  isCaptured: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  color: 'green' | 'blue';
}) {
  const borderColor = isValid
    ? color === 'green' ? 'border-green-400/70' : 'border-blue-400/70'
    : isCaptured
    ? 'border-yellow-400/70'
    : isLastMove
    ? color === 'green' ? 'border-green-500/30' : 'border-blue-500/30'
    : 'border-amber-900/20';

  const shadowColor = isValid
    ? color === 'green' ? 'shadow-green-500/30' : 'shadow-blue-500/30'
    : isCaptured
    ? 'shadow-yellow-500/40'
    : '';

  // Generate stone colors for visualization
  const stoneColors = Array.from({ length: Math.min(count, 8) }).map((_, i) => {
    const baseHue = isValid
      ? color === 'green' ? 142 : 217
      : 30;
    const lightness = 35 + (i % 4) * 5;
    const saturation = 45 + (i % 3) * 10;
    return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
  });

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      disabled={!isValid}
      className={`relative aspect-square rounded-full flex items-center justify-center transition-all duration-300 border-2 group ${borderColor} ${
        isValid ? `cursor-pointer hover:scale-110 shadow-lg ${shadowColor}` : ''
      } ${isSowing ? 'animate-pulse-ring' : ''} ${isCaptured ? 'animate-capture-flash' : ''}`}
    >
      {/* Outer ring glow for valid moves */}
      {isValid && (
        <div className={`absolute inset-0 rounded-full animate-pulse-subtle ${
          color === 'green' ? 'bg-green-400/5' : 'bg-blue-400/5'
        }`} />
      )}

      {/* Active player indicator */}
      {isPlayerPit && !isValid && count > 0 && (
        <div className={`absolute inset-0 rounded-full border ${
          color === 'green' ? 'border-green-500/10' : 'border-blue-500/10'
        }`} />
      )}

      {/* Pit background - 3D bowl effect */}
      <div className={`absolute inset-[3px] rounded-full transition-all duration-300 ${
        isValid
          ? `bg-gradient-to-b ${color === 'green' ? 'from-green-900/50 to-green-950/70' : 'from-blue-900/50 to-blue-950/70'}`
          : 'bg-gradient-to-b from-amber-950/70 to-stone-950/80'
      }`} style={{
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(255,255,255,0.03)',
      }} />

      {/* Inner highlight */}
      <div className="absolute inset-[15%] rounded-full bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

      {/* Hover preview tooltip */}
      {isHovered && isValid && count > 0 && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-stone-900/95 text-amber-200 text-xs px-3 py-1.5 rounded-lg shadow-xl border border-amber-700/30 whitespace-nowrap backdrop-blur-sm">
            <span className="font-bold">{count}</span>石を配る
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900/95 rotate-45 border-r border-b border-amber-700/30" />
          </div>
        </div>
      )}

      {/* Stone count and visualization */}
      <div className="relative z-10 flex flex-col items-center gap-0.5">
        {/* Main count */}
        <span className={`text-lg md:text-2xl font-black transition-all drop-shadow-lg ${
          isValid
            ? color === 'green' ? 'text-green-100' : 'text-blue-100'
            : 'text-amber-100/80'
        } ${isSowing ? 'animate-bounce-small' : ''}`}>
          {count}
        </span>

        {/* Stone dots visualization */}
        {count > 0 && count <= 8 && (
          <div className="flex flex-wrap gap-[2px] justify-center max-w-[36px]">
            {stoneColors.map((c, i) => (
              <div
                key={i}
                className="w-[5px] h-[5px] rounded-full shadow-sm"
                style={{
                  backgroundColor: c,
                  boxShadow: `inset 0 -1px 1px rgba(0,0,0,0.3), 0 1px 1px rgba(0,0,0,0.2)`,
                }}
              />
            ))}
          </div>
        )}
        {count > 8 && (
          <div className="text-[8px] text-amber-400/40 font-medium">
            +{count - 8}
          </div>
        )}
      </div>

      {/* Pit number indicator */}
      <div className={`absolute bottom-[2px] text-[7px] font-mono transition-opacity ${
        isValid ? (color === 'green' ? 'text-green-400/40' : 'text-blue-400/40') : 'text-amber-600/15'
      } ${isHovered && isValid ? 'opacity-100' : 'opacity-60'}`}>
        {pit + 1}
      </div>
    </button>
  );
}
