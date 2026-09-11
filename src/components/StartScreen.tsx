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

        // Draw stone with 3D effect
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
        
        // Highlight
        ctx.beginPath();
        ctx.arc(-s.size * 0.3, -s.size * 0.3, s.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * 0.3})`;
        ctx.fill();
        
        ctx.restore();

        // Connect nearby stones with glowing lines
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
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-zinc-900 to-stone-950" />
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(217,119,6,0.12) 0%, transparent 50%)`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.06)_0%,_transparent_50%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-md w-full">
        <div className="relative bg-gradient-to-b from-stone-800/80 to-stone-900/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/[0.08] overflow-hidden">
          {/* Top glow */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-500/[0.05] to-transparent pointer-events-none" />
          
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
            boxShadow: 'inset 0 0 60px rgba(217,119,6,0.05)',
          }} />

          {/* Title section */}
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

          {/* Difficulty selection */}
          <div className="relative mb-6">
            <label className="text-[10px] text-amber-400/40 font-semibold tracking-[0.2em] uppercase block text-center mb-3">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'easy' as const, label: '簡単', icon: '🌱', desc: 'AI Depth 4' },
                { key: 'medium' as const, label: '普通', icon: '🌿', desc: 'AI Depth 8' },
                { key: 'hard' as const, label: '難しい', icon: '🌳', desc: 'AI Depth 12' },
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

          {/* Start button */}
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

          {/* Rules toggle */}
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full mt-5 text-amber-400/40 hover:text-amber-300/60 text-xs transition-colors py-2 flex items-center justify-center gap-2"
          >
            <span>📖</span>
            <span>{showRules ? 'ルールを隠す' : 'ルールを見る'}</span>
            <span className={`transition-transform duration-300 text-[10px] ${showRules ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* Rules panel */}
          {showRules && (
            <div className="mt-3 bg-white/[0.03] backdrop-blur-sm rounded-xl p-4 border border-white/[0.05] animate-fade-in">
              <div className="space-y-3 text-xs">
                {[
                  { icon: '🎯', text: '自分の穴を選んで石を反時計回りに配ります' },
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

          {/* Keyboard hint */}
          <div className="mt-6 text-center text-[10px] text-amber-400/20">
            💡 キーボード: 1-6で穴を選択、Hでヒント表示
          </div>
        </div>
      </div>
    </div>
  );
}
