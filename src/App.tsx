import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
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

type Difficulty = 'easy' | 'medium' | 'hard';

function getAIDepth(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 10;
    case 'medium': return 30;
    case 'hard': return 80;
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

// ===== Start Screen Component =====
function StartScreen({ onStart, difficulty, onDifficultyChange }: {
  onStart: () => void;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showRules, setShowRules] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    interface Stone {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      hue: number;
      rotation: number;
      rotationSpeed: number;
    }

    const stones: Stone[] = [];
    for (let i = 0; i < 70; i++) {
      stones.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 8 + 4,
        opacity: Math.random() * 0.35 + 0.08,
        hue: 25 + Math.random() * 25,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stones.forEach((s, i) => {
        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.rotationSpeed;
        
        if (s.x < 0 || s.x > canvas.width) s.vx *= -1;
        if (s.y < 0 || s.y > canvas.height) s.vy *= -1;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        
        const gradient = ctx.createRadialGradient(-s.size * 0.3, -s.size * 0.3, 0, 0, 0, s.size);
        gradient.addColorStop(0, `hsla(${s.hue}, 80%, 70%, ${s.opacity})`);
        gradient.addColorStop(0.5, `hsla(${s.hue}, 70%, 50%, ${s.opacity})`);
        gradient.addColorStop(1, `hsla(${s.hue}, 60%, 25%, ${s.opacity * 0.6})`);
        
        ctx.beginPath();
        ctx.arc(0, 0, s.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(-s.size * 0.3, -s.size * 0.3, s.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * 0.3})`;
        ctx.fill();
        
        ctx.restore();

        for (let j = i + 1; j < stones.length; j++) {
          const s2 = stones[j];
          const dx = s.x - s2.x;
          const dy = s.y - s2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.08;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.strokeStyle = `hsla(35, 60%, 50%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsla(35, 60%, 50%, ${alpha})`;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      });

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-zinc-900 to-stone-950" />
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(217,119,6,0.12) 0%, transparent 50%)`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.06)_0%,_transparent_50%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative z-10 max-w-md w-full">
        <div className="relative bg-gradient-to-b from-stone-800/80 to-stone-900/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/[0.08] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-500/[0.05] to-transparent pointer-events-none" />
          
          <div className="relative text-center mb-8">
            <div className="inline-block mb-5 animate-float-gentle">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-2xl shadow-amber-500/30 transform hover:scale-110 transition-transform duration-300">
                <span className="text-5xl">🏺</span>
              </div>
            </div>
            <h1 className="text-6xl font-black text-white mb-2 tracking-tight">
              マンカラ
            </h1>
            <p className="text-amber-400/40 text-sm tracking-[0.3em] font-medium">
              MANCALA • AI BATTLE
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-amber-500/30" />
              <span className="text-amber-500/30 text-xs font-semibold">4000年の歴史</span>
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-amber-500/30" />
            </div>
          </div>

          <div className="relative mb-6">
            <label className="text-[10px] text-amber-400/40 font-semibold tracking-[0.2em] uppercase block text-center mb-3">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'easy' as const, label: '簡単', icon: '🌱', desc: 'MCTS 1000回' },
                { key: 'medium' as const, label: '普通', icon: '🌿', desc: 'MCTS 3000回' },
                { key: 'hard' as const, label: '難しい', icon: '🌳', desc: 'MCTS 8000回' },
              ]).map((d) => (
                <button
                  key={d.key}
                  onClick={() => onDifficultyChange(d.key)}
                  className={`relative p-4 rounded-xl transition-all duration-300 border ${
                    difficulty === d.key
                      ? 'bg-amber-500/[0.12] border-amber-500/30 shadow-lg shadow-amber-500/10 scale-105'
                      : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1]'
                  }`}
                >
                  <div className="text-3xl mb-2">{d.icon}</div>
                  <div className={`text-sm font-bold ${difficulty === d.key ? 'text-amber-200' : 'text-amber-300/50'}`}>
                    {d.label}
                  </div>
                  <div className="text-[9px] text-amber-400/30 mt-1">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onStart}
            className="relative w-full group overflow-hidden rounded-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 animate-shimmer" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative py-4 text-lg font-black text-stone-900 tracking-wider">
              ゲーム開始
            </div>
          </button>

          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full mt-5 text-amber-400/40 hover:text-amber-300/60 text-xs transition-colors py-2 flex items-center justify-center gap-2"
          >
            <span>📖</span>
            <span>{showRules ? 'ルールを隠す' : 'ルールを見る'}</span>
            <span className={`transition-transform duration-300 text-[10px] ${showRules ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {showRules && (
            <div className="mt-3 bg-white/[0.03] backdrop-blur-sm rounded-xl p-4 border border-white/[0.05] animate-fade-in">
              <div className="space-y-3 text-xs">
                {[
                  { icon: '🎯', text: '各穴に3個ずつ石を配置し、自分の穴を選んで反時計回りに配ります' },
                  { icon: '✨', text: '最後の石が自分のマンカラに入ったらボーナスターン', color: 'text-green-400' },
                  { icon: '💎', text: '最後の石が自分の空の穴に入ったら反対側の石をゲット', color: 'text-yellow-400' },
                  { icon: '🏁', text: 'どちらかの穴が全て空になったらゲーム終了' },
                  { icon: '🏆', text: '最も多くの石を集めた方が勝ち！', color: 'text-amber-300' },
                ].map((rule, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="min-w-[20px] text-base">{rule.icon}</span>
                    <p className={`text-amber-200/50 ${rule.color || ''}`}>{rule.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-[10px] text-amber-400/20">
            💡 キーボード: 1-6で穴を選択、Hでヒント表示
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Game Board Component =====
const GameBoard = memo(function GameBoard({
  board,
  currentPlayer,
  gameOver,
  aiThinking,
  animating,
  validMoves,
  hintPit,
  showHint,
  onPitClick,
}: {
  board: Board;
  currentPlayer: Player;
  gameOver: boolean;
  aiThinking: boolean;
  animating: boolean;
  validMoves: number[];
  hintPit: number | null;
  showHint: boolean;
  onPitClick: (pit: number) => void;
}) {
  return (
    <div className="relative z-10 w-full max-w-5xl px-2 md:px-4">
      <div className="relative rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-800/85 via-amber-900/85 to-amber-950/85 rounded-2xl md:rounded-[2rem]" />
        <div className="absolute inset-0 rounded-2xl md:rounded-[2rem] opacity-[0.08] pointer-events-none" style={{
          backgroundImage: `
            repeating-linear-gradient(87deg, transparent, transparent 12px, rgba(80,40,10,0.6) 12px, rgba(80,40,10,0.6) 13px),
            repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(100,50,10,0.4) 20px, rgba(100,50,10,0.4) 21px)
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
                    isHint={hintPit === pit && showHint}
                    onClick={() => currentPlayer === 2 && !gameOver && onPitClick(pit)}
                    color="blue"
                  />
                ))}
              </div>

              <div className="flex items-center justify-center h-0.5">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-600/20 to-transparent" />
              </div>

              <div className="grid grid-cols-6 gap-1 md:gap-2">
                {[0, 1, 2, 3, 4, 5].map((pit) => (
                  <PitCell
                    key={pit}
                    pit={pit}
                    count={board[pit]}
                    isValid={validMoves.includes(pit)}
                    isHint={hintPit === pit && showHint}
                    onClick={() => onPitClick(pit)}
                    color="green"
                  />
                ))}
              </div>
            </div>

            <StorePit count={board[13]} label="AI" active={currentPlayer === 2 && !gameOver} color="blue" />
          </div>
        </div>
      </div>
    </div>
  );
});

function StorePit({ count, label, active, color }: { count: number; label: string; active: boolean; color: 'green' | 'blue' }) {
  const colors = {
    green: {
      active: 'from-green-900/60 to-green-950/80 border-green-400/50',
      inactive: 'from-stone-900/70 to-stone-950/90 border-amber-800/25',
      text: 'text-green-400',
    },
    blue: {
      active: 'from-blue-900/60 to-blue-950/80 border-blue-400/50',
      inactive: 'from-stone-900/70 to-stone-950/90 border-amber-800/25',
      text: 'text-blue-400',
    },
  };
  const c = colors[color];

  return (
    <div className="flex flex-col justify-center">
      <div className={`relative w-12 h-36 sm:w-14 sm:h-44 md:w-[5rem] md:h-60 rounded-[45%] flex items-center justify-center transition-all duration-700 bg-gradient-to-b border-2 ${
        active ? `${c.active} shadow-xl` : c.inactive
      }`} style={{
        boxShadow: active
          ? `inset 0 4px 20px rgba(0,0,0,0.7), 0 0 40px ${color === 'green' ? 'rgba(74,222,128,0.2)' : 'rgba(96,165,250,0.2)'}`
          : 'inset 0 4px 20px rgba(0,0,0,0.7)',
      }}>
        <div className="absolute inset-2 md:inset-3 rounded-[45%] bg-black/40" style={{
          boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.6)',
        }} />
        <div className="absolute inset-[10%] rounded-[45%] bg-gradient-to-b from-white/[0.06] to-transparent" />

        <div className="relative z-10 flex flex-col items-center gap-1">
          {count > 0 && count <= 20 && (
            <div className="flex flex-wrap gap-[2px] justify-center max-w-[35px] md:max-w-[45px]">
              {Array.from({ length: Math.min(count, 12) }).map((_, i) => (
                <div
                  key={i}
                  className="w-[5px] h-[5px] md:w-[6px] md:h-[6px] rounded-full"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, hsl(${35 + i * 2}, 85%, 65%), hsl(${30 + i * 2}, 75%, 25%))`,
                    boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.5)',
                  }}
                />
              ))}
            </div>
          )}
          <div className={`text-2xl sm:text-3xl md:text-5xl font-black ${c.text} drop-shadow-lg transition-all duration-500`}>
            {count}
          </div>
          <div className={`text-[8px] sm:text-[9px] md:text-[10px] ${c.text}/50 font-bold tracking-[0.2em]`}>{label}</div>
        </div>

        {active && (
          <div className={`absolute -inset-1 md:-inset-1.5 rounded-[45%] border ${color === 'green' ? 'border-green-400/25' : 'border-blue-400/25'} animate-pulse`} />
        )}
      </div>
    </div>
  );
}

function PitCell({ pit, count, isValid, isHint, onClick, color }: {
  pit: number;
  count: number;
  isValid: boolean;
  isHint: boolean;
  onClick: () => void;
  color: 'green' | 'blue';
}) {
  const colors = {
    green: {
      valid: 'border-green-400/70 shadow-green-500/25',
      hint: 'border-purple-400/80 shadow-purple-500/50',
      default: 'border-amber-900/20',
      text: 'text-green-300',
    },
    blue: {
      valid: 'border-blue-400/70 shadow-blue-500/25',
      hint: 'border-purple-400/80 shadow-purple-500/50',
      default: 'border-amber-900/20',
      text: 'text-blue-300',
    },
  };
  const c = colors[color];

  const borderClass = isHint ? c.hint : isValid ? c.valid : c.default;

  return (
    <button
      onClick={onClick}
      disabled={!isValid}
      aria-label={`穴 ${pit + 1}: ${count}個の石${isValid ? '（クリック可能）' : ''}`}
      className={`relative aspect-square rounded-full transition-all duration-300 border-2 ${borderClass} ${
        isValid ? 'cursor-pointer hover:scale-110 shadow-lg active:scale-95' : 'opacity-50'
      } ${isHint ? 'animate-pulse' : ''}`}
    >
      <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-stone-900/80 to-stone-950/95" style={{
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.7)',
      }} />

      <div className="absolute inset-[10%] rounded-full bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

      {isValid && !isHint && (
        <>
          <div className={`absolute inset-0 rounded-full animate-pulse-subtle ${
            color === 'green' ? 'bg-green-400/[0.1]' : 'bg-blue-400/[0.1]'
          }`} />
          <div className={`absolute -inset-0.5 rounded-full ${
            color === 'green' ? 'bg-green-400/20' : 'bg-blue-400/20'
          } blur-sm`} />
        </>
      )}

      {isHint && (
        <div className="absolute inset-0 rounded-full bg-purple-400/20 animate-pulse" />
      )}

      {count > 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-16 h-16">
            {Array.from({ length: Math.min(count, 8) }).map((_, i) => {
              const angle = (i / Math.min(count, 8)) * Math.PI * 2;
              const radius = count === 1 ? 0 : 6;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    left: `calc(50% + ${x}px - 6px)`,
                    top: `calc(50% + ${y}px - 6px)`,
                    background: `radial-gradient(circle at 30% 30%, hsl(${35 + i * 3}, 80%, 60%), hsl(${30 + i * 3}, 70%, 25%))`,
                    boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {count > 0 && (
        <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-xs md:text-sm font-black ${c.text} drop-shadow-md z-10`}>
          {count}
        </div>
      )}
    </button>
  );
}

// ===== Game Over Modal Component =====
const GameOverModal = memo(function GameOverModal({
  winner,
  board,
  stats,
  gameTime,
  onRestart,
  onSettings,
}: {
  winner: Player | 0 | null;
  board: Board;
  stats: GameStats;
  gameTime: number;
  onRestart: () => void;
  onSettings: () => void;
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="relative bg-gradient-to-b from-stone-800/95 to-stone-900/95 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-white/10 animate-scale-in overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.1)_0%,_transparent_60%)] pointer-events-none" />

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
            <div className={`text-center rounded-xl p-4 min-w-[100px] backdrop-blur-sm ${
              winner === 1 ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/[0.03] border border-white/[0.05]'
            }`}>
              <div className={`text-4xl font-black ${winner === 1 ? 'text-green-400' : 'text-amber-200/60'}`}>{board[6]}</div>
              <div className="text-[10px] text-amber-300/40 mt-1">YOU 👤</div>
            </div>
            <div className="text-amber-600/20 text-2xl font-bold self-center">VS</div>
            <div className={`text-center rounded-xl p-4 min-w-[100px] backdrop-blur-sm ${
              winner === 2 ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/[0.03] border border-white/[0.05]'
            }`}>
              <div className={`text-4xl font-black ${winner === 2 ? 'text-blue-400' : 'text-amber-200/60'}`}>{board[13]}</div>
              <div className="text-[10px] text-amber-300/40 mt-1">AI 🤖</div>
            </div>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-sm rounded-xl p-3 mb-5 border border-white/[0.05]">
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
              onClick={onRestart}
              className="flex-1 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-yellow-500 group-hover:from-amber-400 group-hover:to-yellow-400 transition-all" />
              <div className="relative py-3 font-black text-sm text-stone-900">
                もう一度 🔄
              </div>
            </button>
            <button
              onClick={onSettings}
              className="flex-1 bg-white/[0.05] backdrop-blur-sm text-amber-200/60 py-3 rounded-xl font-bold text-sm hover:bg-white/[0.08] transition-all border border-white/[0.08]"
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
  );
});

// ===== Main App Component =====
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
        const iterations = getAIDepth(difficulty) * 100;
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

  const totalStones = 36;
  const p1Total = board[6] + getPlayerPits(1).reduce((s, p) => s + board[p], 0);
  const p2Total = board[13] + getPlayerPits(2).reduce((s, p) => s + board[p], 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-zinc-900 to-stone-950 flex flex-col items-center relative overflow-hidden select-none">
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
                <div className="text-[10px] text-amber-400/40">{p1Total}/{totalStones}</div>
                <div className="text-sm text-amber-300/50 font-bold">{Math.round((board[6] / totalStones) * 100)}%</div>
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
                <div className="text-[10px] text-amber-400/40">{p2Total}/{totalStones}</div>
                <div className="text-sm text-amber-300/50 font-bold">{Math.round((board[13] / totalStones) * 100)}%</div>
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
