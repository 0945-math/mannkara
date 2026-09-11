import { memo } from 'react';
import { Board, Player } from '../game/mancala';

interface GameBoardProps {
  board: Board;
  currentPlayer: Player;
  gameOver: boolean;
  aiThinking: boolean;
  animating: boolean;
  validMoves: number[];
  hintPit: number | null;
  showHint: boolean;
  onPitClick: (pit: number) => void;
}

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
}: GameBoardProps) {
  return (
    <div className="relative z-10 w-full max-w-5xl px-2 md:px-4">
      <div className="relative rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl">
        {/* Board background */}
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
            {/* Player 1 Store */}
            <StorePit count={board[6]} label="YOU" active={currentPlayer === 1 && !gameOver} color="green" />

            {/* Pits */}
            <div className="flex-1 flex flex-col gap-1.5 md:gap-3">
              {/* Turn indicator */}
              {!gameOver && !animating && (
                <div className="flex items-center justify-center h-1">
                  <div className={`h-0.5 w-20 rounded-full transition-all duration-500 ${
                    currentPlayer === 1
                      ? 'bg-gradient-to-r from-transparent via-green-400/50 to-transparent'
                      : 'bg-gradient-to-r from-transparent via-blue-400/50 to-transparent'
                  }`} />
                </div>
              )}

              {/* AI Pits (Top) */}
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

              {/* Divider */}
              <div className="flex items-center justify-center h-0.5">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-600/20 to-transparent" />
              </div>

              {/* Player Pits (Bottom) */}
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

            {/* Player 2 Store */}
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
          {/* Stones visualization */}
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
      {/* Pit background */}
      <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-stone-900/80 to-stone-950/95" style={{
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.7)',
      }} />

      {/* Highlight */}
      <div className="absolute inset-[10%] rounded-full bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

      {/* Valid move glow */}
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

      {/* Hint glow */}
      {isHint && (
        <div className="absolute inset-0 rounded-full bg-purple-400/20 animate-pulse" />
      )}

      {/* Stones */}
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

      {/* Count */}
      {count > 0 && (
        <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-xs md:text-sm font-black ${c.text} drop-shadow-md z-10`}>
          {count}
        </div>
      )}
    </button>
  );
}

export default GameBoard;
