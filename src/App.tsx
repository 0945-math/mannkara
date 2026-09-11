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
  SowingStep,
  getHint,
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

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'circle' | 'star' | 'spark';
}

// Enhanced Particle System
function ParticleSystem({ particles }: { particles: Particle[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            opacity: p.life / p.maxLife,
            transform: `translate(-50%, -50%) rotate(${(p.life / p.maxLife) * 360}deg)`,
            transition: 'all 0.05s linear',
          }}
        >
          {p.type === 'circle' && (
            <div 
              className="w-full h-full rounded-full"
              style={{
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size}px ${p.color}`,
              }}
            />
          )}
          {p.type === 'star' && (
            <div 
              className="w-full h-full"
              style={{
                backgroundColor: p.color,
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                boxShadow: `0 0 ${p.size}px ${p.color}`,
              }}
            />
          )}
          {p.type === 'spark' && (
            <div 
              className="w-full h-full rounded-full"
              style={{
                background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Enhanced Confetti
function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface ConfettiPiece {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotSpeed: number;
      shape: number;
    }

    const colors = ['#fbbf24', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#ec4899', '#fcd34d'];
    const pieces: ConfettiPiece[] = [];

    for (let i = 0; i < 200; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 5 + 4,
        size: Math.random() * 14 + 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.5,
        shape: Math.floor(Math.random() * 4),
      });
    }

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

        if (p.shape === 0) {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 2) {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        } else {
          // Star shape
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * p.size / 2;
            const y = Math.sin(angle) * p.size / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      if (pieces.some(p => p.y < canvas.height + 50)) {
        animId = requestAnimationFrame(animate);
      }
    };
    animate();

    return () => cancelAnimationFrame(animId);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[60]" />;
}

// Ultra-realistic 3D Stone
function Stone({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-6 h-6' };
  return (
    <div className={`${sizeMap[size]} rounded-full relative`}>
      {/* Base stone */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 shadow-lg" />
      {/* Highlight */}
      <div className="absolute inset-[6%] rounded-full bg-gradient-to-br from-white/60 via-amber-100/30 to-transparent" />
      {/* Secondary highlight */}
      <div className="absolute top-[15%] left-[20%] w-[35%] h-[25%] rounded-full bg-white/40 blur-[1px]" />
      {/* Shadow */}
      <div className="absolute bottom-[10%] right-[15%] w-[30%] h-[30%] rounded-full bg-black/50 blur-[2px]" />
      {/* Rim light */}
      <div className="absolute inset-0 rounded-full ring-1 ring-amber-300/30" />
    </div>
  );
}

// Realistic stone cluster
function StoneCluster({ count, highlight }: { count: number; highlight?: boolean }) {
  if (count === 0) return null;

  const positions = [
    { x: 0, y: -5 }, { x: -7, y: 3 }, { x: 7, y: 3 },
    { x: -4, y: -7 }, { x: 4, y: -7 }, { x: -9, y: -2 },
    { x: 9, y: -2 }, { x: 0, y: 7 },
  ];

  const stonesToShow = Math.min(count, 8);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative w-16 h-16">
        {positions.slice(0, stonesToShow).map((pos, i) => (
          <div
            key={i}
            className={`absolute transition-all duration-300 ${highlight ? 'animate-bounce-small' : ''}`}
            style={{
              left: `calc(50% + ${pos.x}px - 6px)`,
              top: `calc(50% + ${pos.y}px - 6px)`,
              animationDelay: `${i * 25}ms`,
              zIndex: i,
            }}
          >
            <Stone size="sm" />
          </div>
        ))}
      </div>
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
  const [message, setMessage] = useState('あなたの番です。穴を選んでください。');
  const [gameStarted, setGameStarted] = useState(false);
  const [stats, setStats] = useState<GameStats>({ moveCount: 0, captures: 0, extraTurns: 0, wins: 0, losses: 0, draws: 0 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [aiInfo, setAiInfo] = useState<AIMoveInfo | null>(null);
  const [showAiHint, setShowAiHint] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [sourcePit, setSourcePit] = useState<number | null>(null);
  const [landingPit, setLandingPit] = useState<number | null>(null);
  const [capturedPits, setCapturedPits] = useState<Set<number>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastCapture, setLastCapture] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [thinkingDots, setThinkingDots] = useState(0);
  const [hoveredPit, setHoveredPit] = useState<number | null>(null);
  const [hintPit, setHintPit] = useState<number | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [gameTime, setGameTime] = useState(0);
  const [showHint, setShowHint] = useState(false);

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

  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.6,
          life: p.life - 1,
        }))
        .filter(p => p.life > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [particles.length > 0]);

  const createParticles = useCallback((x: number, y: number, color: string, count: number = 30) => {
    const newParticles: Particle[] = [];
    const types: Array<'circle' | 'star' | 'spark'> = ['circle', 'star', 'spark'];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 6,
        life: 80,
        maxLife: 80,
        color,
        size: Math.random() * 8 + 4,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setCurrentPlayer(1);
    setGameOver(false);
    setWinner(null);
    setAiThinking(false);
    setMessage('あなたの番です。穴を選んでください。');
    setGameStarted(true);
    setCapturedPits(new Set());
    setAiInfo(null);
    setAnimating(false);
    setSourcePit(null);
    setLandingPit(null);
    setShowConfetti(false);
    setLastCapture(false);
    setHintPit(null);
    setParticles([]);
    setGameTime(0);
    setShowHint(false);
  }, []);

  const animateSowing = useCallback((steps: SowingStep[], callback: () => void) => {
    let i = 0;
    const animate = () => {
      if (i < steps.length) {
        const step = steps[i];
        setBoard(step.boardAfter);
        setLandingPit(step.pit);
        soundEngine.playStoneDrop();
        i++;
        const delay = 50 + Math.random() * 15;
        setTimeout(animate, delay);
      } else {
        setTimeout(() => {
          setLandingPit(null);
          callback();
        }, 80);
      }
    };
    animate();
  }, []);

  const executeMove = useCallback((pit: number, player: Player) => {
    setAnimating(true);
    setSourcePit(pit);
    setHintPit(null);

    const tempBoard = [...board];
    tempBoard[pit] = 0;
    setBoard(tempBoard);

    const result = makeMove(board, pit, player);

    setTimeout(() => {
      animateSowing(result.sowingSteps, () => {
        setBoard(result.newBoard);
        setSourcePit(null);

        if (result.captured && result.capturedPit !== null) {
          setCapturedPits(new Set([result.capturedPit, result.sowingPath[result.sowingPath.length - 1]]));
          setLastCapture(true);
          soundEngine.playCapture();
          
          const pitElement = document.querySelector(`[data-pit="${result.capturedPit}"]`);
          if (pitElement) {
            const rect = pitElement.getBoundingClientRect();
            createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#fbbf24', 40);
          }
          
          setTimeout(() => {
            setCapturedPits(new Set());
            setLastCapture(false);
          }, 800);
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
          if (w === 1) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 6000);
            // Create celebration particles
            for (let i = 0; i < 5; i++) {
              setTimeout(() => {
                createParticles(
                  Math.random() * window.innerWidth,
                  Math.random() * window.innerHeight * 0.5,
                  ['#fbbf24', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'][i],
                  50
                );
              }, i * 200);
            }
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
      });
    }, 120);
  }, [board, animateSowing, createParticles]);

  const handlePlayerMove = useCallback((pit: number) => {
    if (gameOver || currentPlayer !== 1 || aiThinking || animating) return;
    if (!isValidMove(board, pit, 1)) return;

    soundEngine.playClick();
    setStats(prev => ({
      ...prev,
      moveCount: prev.moveCount + 1,
    }));
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
        const info = getBestMove(board, 2, getAIDepth(difficulty));
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

  const validMoves = currentPlayer === 1 && !gameOver && !aiThinking && !animating ? getValidMoves(board, 1) : [];

  const getPreviewPits = useCallback((pit: number): Set<number> => {
    if (!validMoves.includes(pit)) return new Set();
    const stones = board[pit];
    const pits = new Set<number>();
    let idx = pit;
    let remaining = stones;
    while (remaining > 0) {
      idx = (idx + 1) % 14;
      if (currentPlayer === 1 && idx === 13) continue;
      if (currentPlayer === 2 && idx === 6) continue;
      pits.add(idx);
      remaining--;
    }
    return pits;
  }, [board, validMoves, currentPlayer]);

  const previewPits = hoveredPit !== null ? getPreviewPits(hoveredPit) : new Set<number>();

  const handlePitHover = useCallback((pit: number | null) => {
    setHoveredPit(pit);
  }, []);

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

  const totalStones = 48;
  const p1Total = board[6] + getPlayerPits(1).reduce((s, p) => s + board[p], 0);
  const p2Total = board[13] + getPlayerPits(2).reduce((s, p) => s + board[p], 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-zinc-900 to-stone-950 flex flex-col items-center relative overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.04] rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-600/[0.04] rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <ParticleSystem particles={particles} />
      <Confetti active={showConfetti} />

      {/* Header */}
      <div className="relative z-10 w-full max-w-5xl px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-xl shadow-amber-500/30 transform hover:scale-110 transition-transform">
              <span className="text-2xl">🏺</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight leading-none">マンカラ</h1>
              <p className="text-amber-500/40 text-[10px] tracking-[0.2em] font-medium">MANCALA • AI BATTLE</p>
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <div className="text-sm text-amber-400/50 font-mono mr-2 bg-white/5 px-3 py-1 rounded-lg">
              ⏱️ {formatTime(gameTime)}
            </div>
            <button
              onClick={() => setShowRules(!showRules)}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-amber-200/60 hover:text-amber-200 transition-all flex items-center justify-center text-sm font-bold"
              title="ルール"
            >
              ?
            </button>
            <button
              onClick={handleShowHint}
              disabled={currentPlayer !== 1 || gameOver || aiThinking || animating}
              className="w-9 h-9 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-200/60 hover:text-amber-200 transition-all flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              title="ヒント (H)"
            >
              💡
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center text-sm ${soundEnabled ? 'bg-white/5 text-amber-200/60 hover:bg-white/10' : 'bg-white/5 text-amber-200/30 hover:bg-white/10'}`}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button
              onClick={resetGame}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-200 text-xs font-bold transition-all border border-amber-500/20"
            >
              🔄 新規
            </button>
          </div>
        </div>
      </div>

      {showRules && (
        <div className="relative z-10 w-full max-w-5xl px-4 mb-2 animate-fade-in">
          <div className="bg-white/[0.03] backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {[
                { icon: '🎯', text: '自分の穴を選んで石を反時計回りに配る' },
                { icon: '✨', text: '最後の石が自分のマンカラに入ったらボーナスターン', color: 'text-green-400' },
                { icon: '💎', text: '最後の石が自分の空の穴に入ったら反対側の石をゲット', color: 'text-yellow-400' },
                { icon: '🏆', text: '最も多くの石を集めた方が勝ち！', color: 'text-amber-300' },
              ].map((rule, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span>{rule.icon}</span>
                  <span className={`text-amber-200/60 ${rule.color || ''}`}>{rule.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Score Display */}
      <div className="relative z-10 w-full max-w-5xl px-4 mb-2">
        <div className="flex items-center gap-3">
          <div className={`flex-1 rounded-xl p-3 transition-all duration-500 ${
            currentPlayer === 1 && !gameOver
              ? 'bg-gradient-to-br from-green-500/15 to-green-600/10 border border-green-500/30 shadow-lg shadow-green-500/10'
              : 'bg-white/[0.03] border border-white/10'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                currentPlayer === 1 && !gameOver ? 'bg-green-500/20 ring-2 ring-green-400/40' : 'bg-white/10'
              }`}>
                👤
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-amber-400/50 font-semibold">あなた</div>
                <div className="text-3xl font-black text-green-400 leading-none">{board[6]}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-amber-400/40">{p1Total}/{totalStones}</div>
                <div className="text-sm text-amber-300/50 font-bold">{Math.round((board[6] / totalStones) * 100)}%</div>
              </div>
            </div>
          </div>

          <div className="text-amber-600/30 text-sm font-black">VS</div>

          <div className={`flex-1 rounded-xl p-3 transition-all duration-500 ${
            currentPlayer === 2 && !gameOver
              ? 'bg-gradient-to-br from-blue-500/15 to-blue-600/10 border border-blue-500/30 shadow-lg shadow-blue-500/10'
              : 'bg-white/[0.03] border border-white/10'
          }`}>
            <div className="flex items-center gap-2">
              <div className="text-right flex-1">
                <div className="text-[10px] text-amber-400/50 font-semibold">AI</div>
                <div className="text-3xl font-black text-blue-400 leading-none">{board[13]}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-amber-400/40">{p2Total}/{totalStones}</div>
                <div className="text-sm text-amber-300/50 font-bold">{Math.round((board[13] / totalStones) * 100)}%</div>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                currentPlayer === 2 && !gameOver ? 'bg-blue-500/20 ring-2 ring-blue-400/40' : 'bg-white/10'
              }`}>
                🤖
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Bar */}
      <div className="relative z-10 w-full max-w-5xl px-4 mb-3">
        <div className={`rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-all duration-300 ${
          gameOver
            ? winner === 1 ? 'bg-gradient-to-r from-green-500/15 to-green-600/10 text-green-300 border border-green-500/30' :
              winner === 2 ? 'bg-gradient-to-r from-red-500/15 to-red-600/10 text-red-300 border border-red-500/30' :
              'bg-gradient-to-r from-yellow-500/15 to-yellow-600/10 text-yellow-300 border border-yellow-500/30'
            : lastCapture
            ? 'bg-gradient-to-r from-yellow-500/15 to-yellow-600/10 text-yellow-300 border border-yellow-500/30 animate-pulse'
            : showHint
            ? 'bg-gradient-to-r from-purple-500/15 to-purple-600/10 text-purple-300 border border-purple-500/30'
            : aiThinking
            ? 'bg-gradient-to-r from-blue-500/15 to-blue-600/10 text-blue-300 border border-blue-500/30'
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
      <div className="relative z-10 w-full max-w-5xl px-2 md:px-4">
        <div className="relative rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl transform transition-transform duration-500 hover:scale-[1.005]" style={{
          perspective: '1000px',
        }}>
          <div className="absolute inset-0 bg-gradient-to-b from-amber-700/80 via-amber-800/80 to-amber-900/80 rounded-2xl md:rounded-[2rem]" />
          <div className="absolute inset-0 rounded-2xl md:rounded-[2rem] opacity-[0.08] pointer-events-none" style={{
            backgroundImage: `
              repeating-linear-gradient(87deg, transparent, transparent 12px, rgba(80,40,10,0.6) 12px, rgba(80,40,10,0.6) 13px),
              repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(100,50,10,0.4) 20px, rgba(100,50,10,0.4) 21px),
              repeating-linear-gradient(85deg, transparent, transparent 35px, rgba(60,30,10,0.3) 35px, rgba(60,30,10,0.3) 36px)
            `,
          }} />
          <div className="absolute inset-0 rounded-2xl md:rounded-[2rem] bg-[radial-gradient(ellipse_at_center,_rgba(251,191,36,0.05)_0%,_transparent_70%)]" />
          <div className="absolute top-0 left-[5%] right-[5%] h-px bg-gradient-to-r from-transparent via-amber-300/20 to-transparent" />
          <div className="absolute inset-0 rounded-2xl md:rounded-[2rem] shadow-[inset_0_2px_30px_rgba(0,0,0,0.5)]" />

          <div className="relative p-3 md:p-6">
            <div className="flex items-stretch gap-1.5 md:gap-3">
              <StorePit count={board[6]} label="YOU" active={currentPlayer === 1 && !gameOver} color="green" />

              <div className="flex-1 flex flex-col gap-1.5 md:gap-3">
                {!gameOver && !animating && (
                  <div className="flex items-center justify-center h-1">
                    <div className={`h-0.5 w-20 rounded-full transition-all duration-500 ${
                      currentPlayer === 1
                        ? 'bg-gradient-to-r from-transparent via-green-400/50 to-transparent'
                        : 'bg-gradient-to-r from-transparent via-blue-400/50 to-transparent'
                    }`} />
                  </div>
                )}

                <div className="grid grid-cols-6 gap-1 md:gap-2">
                  {[12, 11, 10, 9, 8, 7].map((pit) => (
                    <PitCell
                      key={pit}
                      pit={pit}
                      count={board[pit]}
                      isValid={currentPlayer === 2 && !gameOver && !aiThinking && !animating && board[pit] > 0}
                      isSource={sourcePit === pit}
                      isLanding={landingPit === pit}
                      isCaptured={capturedPits.has(pit)}
                      isPreview={previewPits.has(pit)}
                      isHovered={hoveredPit === pit}
                      isHint={hintPit === pit && showHint}
                      onHover={handlePitHover}
                      onClick={() => currentPlayer === 2 && !gameOver && handlePlayerMove(pit)}
                      color="blue"
                      playerSide={2}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-center h-0.5">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-600/20 to-transparent" />
                </div>

                <div className="grid grid-cols-6 gap-1 md:gap-2">
                  {[0, 1, 2, 3, 4, 5].map((pit) => {
                    const isValid = validMoves.includes(pit);
                    return (
                      <PitCell
                        key={pit}
                        pit={pit}
                        count={board[pit]}
                        isValid={isValid}
                        isSource={sourcePit === pit}
                        isLanding={landingPit === pit}
                        isCaptured={capturedPits.has(pit)}
                        isPreview={previewPits.has(pit)}
                        isHovered={hoveredPit === pit}
                        isHint={hintPit === pit && showHint}
                        onHover={handlePitHover}
                        onClick={() => handlePlayerMove(pit)}
                        color="green"
                        playerSide={1}
                      />
                    );
                  })}
                </div>
              </div>

              <StorePit count={board[13]} label="AI" active={currentPlayer === 2 && !gameOver} color="blue" />
            </div>
          </div>
        </div>
      </div>

      {showAiHint && aiInfo && aiInfo.allScores.length > 0 && (
        <div className="relative z-10 w-full max-w-5xl px-4 mt-3 animate-fade-in">
          <div className="bg-blue-950/30 backdrop-blur rounded-xl p-3 border border-blue-800/20">
            <div className="text-[10px] text-blue-400/50 mb-1.5 font-semibold tracking-wider">🧠 AI EVALUATION</div>
            <div className="flex gap-1.5 flex-wrap">
              {aiInfo.allScores.sort((a, b) => b.score - a.score).map(({ move, score }, idx) => (
                <div key={move} className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${
                  idx === 0 ? 'bg-blue-500/20 text-blue-200 font-bold ring-1 ring-blue-500/30' : 'bg-white/[0.03] text-amber-300/40'
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

      {!gameOver && (
        <div className="relative z-10 w-full max-w-5xl px-4 mt-3">
          <div className="bg-white/[0.03] rounded-lg p-2 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-[10px] text-amber-400/40">
              <span>進行度</span>
              <div className="flex-1 h-1.5 bg-stone-800/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500/50 to-amber-400/50 transition-all duration-500"
                  style={{ width: `${Math.min(100, (stats.moveCount / 20) * 100)}%` }}
                />
              </div>
              <span>{Math.min(100, Math.round((stats.moveCount / 20) * 100))}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-5xl px-4 mt-2 pb-4">
        {!gameOver && currentPlayer === 1 && (
          <div className="text-center mb-2 text-[10px] text-amber-400/30">
            💡 キーボード: 1-6 で穴を選択、H でヒント
          </div>
        )}
        
        <div className="flex gap-2 justify-center flex-wrap">
          <div className="bg-white/[0.03] px-3 py-1.5 rounded-lg text-[10px] text-amber-300/40 border border-white/[0.05]">
            🎯 手数 <span className="text-amber-200/80 font-bold">{stats.moveCount}</span>
          </div>
          <div className="bg-white/[0.03] px-3 py-1.5 rounded-lg text-[10px] text-amber-300/40 border border-white/[0.05]">
            💎 <span className="text-yellow-300/80 font-bold">{stats.captures}</span>
          </div>
          <div className="bg-white/[0.03] px-3 py-1.5 rounded-lg text-[10px] text-amber-300/40 border border-white/[0.05]">
            ✨ <span className="text-green-300/80 font-bold">{stats.extraTurns}</span>
          </div>
          <div className="bg-white/[0.03] px-3 py-1.5 rounded-lg text-[10px] text-amber-300/40 border border-white/[0.05]">
            🏆 <span className="text-green-300/80 font-bold">{stats.wins}</span>
            <span className="text-amber-400/30 mx-0.5">/</span>
            <span className="text-red-300/80 font-bold">{stats.losses}</span>
            <span className="text-amber-400/30 mx-0.5">/</span>
            <span className="text-yellow-300/80 font-bold">{stats.draws}</span>
          </div>
          <button
            onClick={() => setShowAiHint(!showAiHint)}
            className={`px-3 py-1.5 rounded-lg text-[10px] border transition-all ${
              showAiHint ? 'bg-blue-500/15 text-blue-300/80 border-blue-500/30' : 'bg-white/[0.03] text-amber-300/40 border-white/[0.05] hover:bg-white/[0.05]'
            }`}
          >
            🧠 AI解析
          </button>
          <div className="bg-white/[0.03] px-3 py-1.5 rounded-lg text-[10px] text-amber-300/40 border border-white/[0.05]">
            {difficulty === 'easy' ? '🌱' : difficulty === 'medium' ? '🌿' : '🌳'} {difficulty === 'easy' ? '簡単' : difficulty === 'medium' ? '普通' : '難しい'}
          </div>
        </div>
      </div>

      {gameOver && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative bg-gradient-to-b from-stone-800/95 to-stone-900/95 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-white/10 animate-scale-in overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.08)_0%,_transparent_60%)] pointer-events-none" />

            <div className="relative">
              <div className="text-7xl mb-3">
                {winner === 1 ? '🎉' : winner === 2 ? '🤖' : '🤝'}
              </div>
              <h2 className="text-3xl font-black text-white mb-1">
                {winner === 1 ? '勝利！' : winner === 2 ? 'AIの勝利' : '引き分け'}
              </h2>
              <p className="text-amber-300/50 text-sm mb-5">
                {winner === 1 ? '素晴らしいプレイでした！' : winner === 2 ? 'もう一度挑戦しましょう！' : '互角の戦いでした！'}
              </p>

              <div className="flex justify-center gap-4 mb-5">
                <div className={`text-center rounded-xl p-4 min-w-[100px] ${
                  winner === 1 ? 'bg-green-500/15 border border-green-500/20' : 'bg-white/[0.03] border border-white/[0.05]'
                }`}>
                  <div className={`text-4xl font-black ${winner === 1 ? 'text-green-400' : 'text-amber-200/60'}`}>{board[6]}</div>
                  <div className="text-[10px] text-amber-300/40 mt-1">YOU 👤</div>
                </div>
                <div className="text-amber-600/20 text-2xl font-bold self-center">VS</div>
                <div className={`text-center rounded-xl p-4 min-w-[100px] ${
                  winner === 2 ? 'bg-blue-500/15 border border-blue-500/20' : 'bg-white/[0.03] border border-white/[0.05]'
                }`}>
                  <div className={`text-4xl font-black ${winner === 2 ? 'text-blue-400' : 'text-amber-200/60'}`}>{board[13]}</div>
                  <div className="text-[10px] text-amber-300/40 mt-1">AI 🤖</div>
                </div>
              </div>

              <div className="bg-white/[0.03] rounded-xl p-3 mb-5 border border-white/[0.05]">
                <div className="text-[10px] text-amber-400/40 mb-2 font-semibold">📊 ゲーム統計</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-xl font-bold text-amber-200/80">{stats.moveCount}</div>
                    <div className="text-[10px] text-amber-400/40">手数</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-yellow-300/80">{stats.captures}</div>
                    <div className="text-[10px] text-amber-400/40">キャプチャ</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-300/80">{stats.extraTurns}</div>
                    <div className="text-[10px] text-amber-400/40">ボーナス</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.05]">
                  <div className="text-[10px] text-amber-400/40 mb-1">プレイ時間</div>
                  <div className="text-base font-bold text-amber-200/80">{formatTime(gameTime)}</div>
                </div>
                {winner === 1 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.05]">
                    <div className="text-[10px] text-amber-400/40 mb-1">パフォーマンス</div>
                    <div className="flex items-center gap-1 justify-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-lg ${
                          i < Math.min(5, Math.max(1, 5 - Math.floor(stats.moveCount / 5)))
                            ? 'text-amber-400'
                            : 'text-amber-400/20'
                        }`}>★</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={resetGame}
                  className="flex-1 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-yellow-500 group-hover:from-amber-400 group-hover:to-yellow-400 transition-all" />
                  <div className="relative py-3 font-black text-sm text-stone-900">
                    もう一度 🔄
                  </div>
                </button>
                <button
                  onClick={() => { setGameStarted(false); setGameOver(false); }}
                  className="flex-1 bg-white/[0.05] text-amber-200/60 py-3 rounded-xl font-bold text-sm hover:bg-white/[0.08] transition-all border border-white/[0.08]"
                >
                  設定 ⚙️
                </button>
              </div>

              <div className="mt-4 text-[10px] text-amber-400/30">
                {winner === 1 && stats.moveCount <= 15 ? '🌟 パーフェクトゲーム！' :
                 winner === 1 && stats.captures >= 3 ? '💎 キャプチャマスター！' :
                 winner === 2 && '次回こそ勝利を！'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StorePit({ count, label, active, color }: { count: number; label: string; active: boolean; color: 'green' | 'blue' }) {
  const colorMap = {
    green: {
      active: 'from-green-900/50 to-green-950/70 border-green-400/40',
      inactive: 'from-stone-900/60 to-stone-950/80 border-amber-800/20',
      text: 'text-green-400',
      label: 'text-green-400/40',
    },
    blue: {
      active: 'from-blue-900/50 to-blue-950/70 border-blue-400/40',
      inactive: 'from-stone-900/60 to-stone-950/80 border-amber-800/20',
      text: 'text-blue-400',
      label: 'text-blue-400/40',
    },
  };
  const c = colorMap[color];

  return (
    <div className="flex flex-col justify-center">
      <div className={`relative w-12 h-36 sm:w-14 sm:h-44 md:w-[5rem] md:h-60 rounded-[45%] flex items-center justify-center transition-all duration-700 bg-gradient-to-b border-2 ${
        active ? `${c.active} shadow-xl` : c.inactive
      }`} style={{
        boxShadow: active
          ? `inset 0 4px 20px rgba(0,0,0,0.6), 0 0 30px ${color === 'green' ? 'rgba(74,222,128,0.15)' : 'rgba(96,165,250,0.15)'}`
          : 'inset 0 4px 20px rgba(0,0,0,0.6)',
      }}>
        <div className="absolute inset-2 md:inset-3 rounded-[45%] bg-black/30" style={{
          boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.5)',
        }} />
        <div className="absolute inset-[10%] rounded-[45%] bg-gradient-to-b from-white/[0.05] to-transparent" />

        <div className="relative z-10 flex flex-col items-center gap-1">
          {count > 0 && count <= 20 && (
            <div className="flex flex-wrap gap-[2px] justify-center max-w-[35px] md:max-w-[45px]">
              {Array.from({ length: Math.min(count, 12) }).map((_, i) => (
                <div
                  key={i}
                  className="w-[5px] h-[5px] md:w-[6px] md:h-[6px] rounded-full"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, hsl(35, 80%, 60%), hsl(30, 70%, 25%))`,
                    boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.4)',
                  }}
                />
              ))}
            </div>
          )}
          <div className={`text-2xl sm:text-3xl md:text-5xl font-black ${c.text} drop-shadow-lg transition-all duration-500`}>
            {count}
          </div>
          <div className={`text-[8px] sm:text-[9px] md:text-[10px] ${c.label} font-bold tracking-[0.2em]`}>{label}</div>
        </div>

        {active && (
          <div className={`absolute -inset-1 md:-inset-1.5 rounded-[45%] border ${color === 'green' ? 'border-green-400/20' : 'border-blue-400/20'} animate-pulse`} />
        )}
      </div>
    </div>
  );
}

function PitCell({ pit, count, isValid, isSource, isLanding, isCaptured, isPreview, isHovered, isHint, onHover, onClick, color, playerSide }: {
  pit: number;
  count: number;
  isValid: boolean;
  isSource: boolean;
  isLanding: boolean;
  isCaptured: boolean;
  isPreview: boolean;
  isHovered: boolean;
  isHint: boolean;
  onHover: (pit: number | null) => void;
  onClick: () => void;
  color: 'green' | 'blue';
  playerSide: Player;
}) {
  const colorClasses = {
    green: {
      valid: 'border-green-400/60 shadow-green-500/20',
      source: 'border-green-500/20',
      landing: 'border-green-400/40',
      captured: 'border-yellow-400/60 shadow-yellow-500/30',
      hint: 'border-purple-400/70 shadow-purple-500/40',
      default: 'border-amber-900/15',
      countText: 'text-green-300',
    },
    blue: {
      valid: 'border-blue-400/60 shadow-blue-500/20',
      source: 'border-blue-500/20',
      landing: 'border-blue-400/40',
      captured: 'border-yellow-400/60 shadow-yellow-500/30',
      hint: 'border-purple-400/70 shadow-purple-500/40',
      default: 'border-amber-900/15',
      countText: 'text-blue-300',
    },
  };
  const cc = colorClasses[color];

  const borderClass = isHint ? cc.hint :
    isCaptured ? cc.captured :
    isValid ? cc.valid :
    isSource ? cc.source :
    isLanding ? cc.landing :
    cc.default;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => isValid && onHover(pit)}
      onMouseLeave={() => onHover(null)}
      onTouchStart={() => isValid && onHover(pit)}
      onTouchEnd={() => onHover(null)}
      data-pit={pit}
      aria-label={`穴 ${pit + 1}: ${count}個の石${isValid ? '（クリック可能）' : ''}`}
      aria-disabled={!isValid}
      className={`relative aspect-square rounded-full transition-all duration-300 border-2 ${borderClass} ${
        isValid ? `cursor-pointer hover:scale-110 shadow-lg active:scale-95 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${color === 'green' ? 'focus:ring-green-400' : 'focus:ring-blue-400'}` : 'opacity-50'
      } ${isCaptured ? 'animate-capture-flash' : ''} ${isHint ? 'animate-pulse' : ''}`}
    >
      <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-stone-900/70 to-stone-950/90" style={{
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.6), inset 0 -1px 3px rgba(255,255,255,0.03)',
      }} />

      <div className="absolute inset-[10%] rounded-full bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

      {isValid && !isHint && (
        <>
          <div className={`absolute inset-0 rounded-full animate-pulse-subtle ${
            color === 'green' ? 'bg-green-400/[0.08]' : 'bg-blue-400/[0.08]'
          }`} />
          <div className={`absolute -inset-0.5 rounded-full ${
            color === 'green' ? 'bg-green-400/15' : 'bg-blue-400/15'
          } blur-sm`} />
        </>
      )}

      {isHint && (
        <div className="absolute inset-0 rounded-full bg-purple-400/15 animate-pulse" />
      )}

      {isLanding && (
        <div className={`absolute inset-0 rounded-full ${
          color === 'green' ? 'bg-green-400/15' : 'bg-blue-400/15'
        } animate-ping-slow`} />
      )}

      <StoneCluster count={count} highlight={isLanding} />

      {count > 0 && (
        <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] md:text-sm font-black ${cc.countText} drop-shadow-md z-10`}>
          {count}
        </div>
      )}

      {isSource && count === 0 && (
        <div className="absolute inset-[20%] rounded-full border border-dashed border-amber-600/30 animate-pulse" />
      )}

      {isPreview && !isValid && !isHint && (
        <div className={`absolute inset-0 rounded-full ${
          color === 'green' ? 'bg-green-400/15' : 'bg-blue-400/15'
        } animate-pulse`} />
      )}

      {isHovered && isValid && count > 0 && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-stone-900/95 text-amber-200 text-xs px-3 py-1.5 rounded-lg shadow-xl border border-amber-700/30 whitespace-nowrap">
            {count}石を配る
          </div>
        </div>
      )}
    </button>
  );
}
