import { memo } from 'react';
import { Board, Player } from '../game/mancala';

interface GameOverModalProps {
  winner: Player | 0 | null;
  board: Board;
  stats: {
    moveCount: number;
    captures: number;
    extraTurns: number;
    wins: number;
    losses: number;
    draws: number;
  };
  gameTime: number;
  onRestart: () => void;
  onSettings: () => void;
}

const GameOverModal = memo(function GameOverModal({
  winner,
  board,
  stats,
  gameTime,
  onRestart,
  onSettings,
}: GameOverModalProps) {
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

          {/* Score */}
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

          {/* Stats */}
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

          {/* Buttons */}
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

          {/* Achievement message */}
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

export default GameOverModal;
