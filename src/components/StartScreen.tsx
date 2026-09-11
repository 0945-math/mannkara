import { useEffect, useRef, useState } from 'react';

export default function StartScreen({ onStart, difficulty, onDifficultyChange }: {
  onStart: () => void;
  difficulty: 'easy' | 'medium' | 'hard';
  onDifficultyChange: (d: 'easy' | 'medium' | 'hard') => void;
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
    }

    const stones: Stone[] = [];
    for (let i = 0; i < 60; i++) {
      stones.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 7 + 3,
        opacity: Math.random() * 0.3 + 0.05,
        hue: 25 + Math.random() * 20,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stones.forEach((s, i) => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x > canvas.width) s.vx *= -1;
        if (s.y < 0 || s.y > canvas.height) s.vy *= -1;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(s.x - s.size * 0.3, s.y - s.size * 0.3, 0, s.x, s.y, s.size);
        gradient.addColorStop(0, `hsla(${s.hue}, 70%, 60%, ${s.opacity})`);
        gradient.addColorStop(1, `hsla(${s.hue}, 60%, 20%, ${s.opacity * 0.5})`);
        ctx.fillStyle = gradient;
        ctx.fill();

        for (let j = i + 1; j < stones.length; j++) {
          const s2 = stones[j];
          const dx = s.x - s2.x;
          const dy = s.y - s2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.strokeStyle = `hsla(35, 50%, 40%, ${(1 - dist / 130) * 0.05})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
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
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(217,119,6,0.08)_0%,_transparent_50%)] transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(217,119,6,0.1) 0%, transparent 50%)`,
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative z-10 max-w-md w-full">
        <div className="relative bg-gradient-to-b from-stone-800/70 to-stone-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/[0.05] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-amber-500/[0.03] to-transparent pointer-events-none" />

          <div className="relative text-center mb-8">
            <div className="inline-block mb-4 animate-float">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-xl shadow-amber-500/20 transform hover:scale-110 transition-transform duration-300">
                <span className="text-4xl">🏺</span>
              </div>
            </div>
            <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
              マンカラ
            </h1>
            <p className="text-amber-400/30 text-sm tracking-[0.3em] font-medium">
              MANCALA • AI BATTLE
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-500/20" />
              <span className="text-amber-500/25 text-xs">4000年の歴史</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-500/20" />
            </div>
          </div>

          <div className="relative mb-6">
            <label className="text-[10px] text-amber-400/30 font-semibold tracking-[0.2em] uppercase block text-center mb-3">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'easy' as const, label: '簡単', icon: '🌱', desc: 'AI Depth 2' },
                { key: 'medium' as const, label: '普通', icon: '🌿', desc: 'AI Depth 5' },
                { key: 'hard' as const, label: '難しい', icon: '🌳', desc: 'AI Depth 7' },
              ]).map((d) => (
                <button
                  key={d.key}
                  onClick={() => onDifficultyChange(d.key)}
                  className={`relative p-3 rounded-xl transition-all duration-300 border ${
                    difficulty === d.key
                      ? 'bg-amber-500/[0.08] border-amber-500/20 shadow-lg shadow-amber-500/[0.03] scale-105'
                      : 'bg-white/[0.02] border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.06]'
                  }`}
                >
                  <div className="text-2xl mb-1">{d.icon}</div>
                  <div className={`text-xs font-bold ${difficulty === d.key ? 'text-amber-200/80' : 'text-amber-300/40'}`}>
                    {d.label}
                  </div>
                  <div className="text-[9px] text-amber-400/20 mt-0.5">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onStart}
            className="relative w-full group overflow-hidden rounded-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 animate-shimmer" />
            <div className="relative py-4 text-lg font-black text-stone-900 tracking-wider">
              ゲーム開始
            </div>
          </button>

          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full mt-4 text-amber-400/30 hover:text-amber-300/50 text-xs transition-colors py-2 flex items-center justify-center gap-1.5"
          >
            <span>📖</span>
            <span>{showRules ? 'ルールを隠す' : 'ルールを見る'}</span>
            <span className={`transition-transform duration-300 text-[10px] ${showRules ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {showRules && (
            <div className="mt-2 bg-white/[0.02] rounded-xl p-4 border border-white/[0.03] animate-fade-in">
              <div className="space-y-2.5 text-xs">
                {[
                  { icon: '🎯', text: '自分の穴を選んで石を反時計回りに配ります' },
                  { icon: '✨', text: '最後の石が自分のマンカラに入ったらボーナスターン', color: 'text-green-400/70' },
                  { icon: '💎', text: '最後の石が自分の空の穴に入ったら反対側の石をゲット', color: 'text-yellow-400/70' },
                  { icon: '🏁', text: 'どちらかの穴が全て空になったらゲーム終了' },
                  { icon: '🏆', text: '最も多くの石を集めた方が勝ち！', color: 'text-amber-300/70' },
                ].map((rule, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className="min-w-[18px]">{rule.icon}</span>
                    <p className={`text-amber-200/40 ${rule.color || ''}`}>{rule.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-[10px] text-amber-400/15">
            💡 ヒント: キーボードの1-6で穴を選択、Hでヒント表示
          </div>
        </div>
      </div>
    </div>
  );
}
