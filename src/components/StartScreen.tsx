import { useEffect, useRef, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

export default function StartScreen({ onStart, difficulty, onDifficultyChange }: {
  onStart: () => void;
  difficulty: 'easy' | 'medium' | 'hard';
  onDifficultyChange: (d: 'easy' | 'medium' | 'hard') => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const [showRules, setShowRules] = useState(false);
  const [hoveredDiff, setHoveredDiff] = useState<string | null>(null);

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

    const colors = ['#d97706', '#f59e0b', '#92400e', '#b45309', '#78350f', '#fbbf24'];
    for (let i = 0; i < 60; i++) {
      particlesRef.current.push({
        id: i,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 8 + 2,
        opacity: Math.random() * 0.4 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections between nearby particles
      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw particle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        // Draw as diamond/stone shape
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size * 0.8, -p.size * 0.3, p.size * 0.6, p.size * 0.5);
        ctx.quadraticCurveTo(0, p.size, -p.size * 0.6, p.size * 0.5);
        ctx.quadraticCurveTo(-p.size * 0.8, -p.size * 0.3, 0, -p.size);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.restore();

        // Draw connections
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p2 = particlesRef.current[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (1 - dist / 120) * 0.08;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-stone-900 to-yellow-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.2)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(120,53,15,0.15)_0%,_transparent_50%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Decorative mandala */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
        <div className="w-[600px] h-[600px] animate-spin-slow">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {Array.from({ length: 12 }).map((_, i) => (
              <circle
                key={i}
                cx="100"
                cy="100"
                r={30 + i * 5}
                fill="none"
                stroke="#d97706"
                strokeWidth="0.5"
              />
            ))}
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={`l${i}`}
                x1="100"
                y1="100"
                x2={100 + 90 * Math.cos((i * Math.PI) / 12)}
                y2={100 + 90 * Math.sin((i * Math.PI) / 12)}
                stroke="#d97706"
                strokeWidth="0.3"
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-lg w-full">
        <div className="bg-gradient-to-b from-amber-900/80 to-amber-950/90 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl border border-amber-600/20">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 rounded-3xl blur-xl pointer-events-none" />

          {/* Title */}
          <div className="relative text-center mb-8">
            <div className="inline-block mb-4 relative">
              <div className="text-7xl animate-bounce-slow filter drop-shadow-lg">🏺</div>
              <div className="absolute -inset-4 bg-amber-500/10 rounded-full blur-xl" />
            </div>
            <h1 className="text-5xl md:text-6xl font-black mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200">
                マンカラ
              </span>
            </h1>
            <p className="text-amber-300/60 text-lg font-light tracking-widest">
              M A N C A L A
            </p>
            <div className="mt-3 flex items-center justify-center gap-3 text-amber-400/40 text-sm">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-400/40" />
              <span>VS</span>
              <span className="text-lg">🤖</span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-400/40" />
            </div>
          </div>

          {/* Difficulty */}
          <div className="relative mb-8">
            <h3 className="text-amber-200/60 text-xs font-semibold mb-3 text-center uppercase tracking-[0.2em]">
              難易度を選択
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'easy' as const, label: '簡単', icon: '🌱', desc: '初心者向け', color: 'from-green-500/20 to-green-600/10' },
                { key: 'medium' as const, label: '普通', icon: '🌿', desc: 'バランス型', color: 'from-amber-500/20 to-amber-600/10' },
                { key: 'hard' as const, label: '難しい', icon: '🌳', desc: '上級者向け', color: 'from-red-500/20 to-red-600/10' },
              ]).map((d) => (
                <button
                  key={d.key}
                  onClick={() => onDifficultyChange(d.key)}
                  onMouseEnter={() => setHoveredDiff(d.key)}
                  onMouseLeave={() => setHoveredDiff(null)}
                  className={`relative p-3 rounded-xl transition-all duration-300 border-2 overflow-hidden ${
                    difficulty === d.key
                      ? 'border-amber-400/60 shadow-lg shadow-amber-500/20 scale-105'
                      : 'border-amber-800/20 hover:border-amber-600/40'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-b ${d.color} transition-opacity ${
                    difficulty === d.key || hoveredDiff === d.key ? 'opacity-100' : 'opacity-0'
                  }`} />
                  <div className="relative">
                    <div className="text-2xl mb-1">{d.icon}</div>
                    <div className={`text-sm font-bold transition-colors ${
                      difficulty === d.key ? 'text-amber-100' : 'text-amber-300/60'
                    }`}>
                      {d.label}
                    </div>
                    <div className="text-[10px] text-amber-400/40 mt-0.5">{d.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={onStart}
            className="relative w-full group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 opacity-100 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-[1px] bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 rounded-[15px]" />
            <div className="relative py-4 text-xl font-black text-amber-950 tracking-wider">
              ゲーム開始
            </div>
          </button>

          {/* Rules Toggle */}
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full mt-5 text-amber-400/50 hover:text-amber-300/80 text-sm transition-colors py-2 flex items-center justify-center gap-2"
          >
            <span>📖</span>
            <span>{showRules ? 'ルールを隠す' : 'ルールを見る'}</span>
            <span className={`transition-transform duration-300 ${showRules ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {showRules && (
            <div className="mt-3 bg-amber-950/40 rounded-xl p-5 border border-amber-800/20 animate-fade-in">
              <div className="space-y-3 text-sm">
                {[
                  { icon: '🎯', text: '自分の穴を選んで、石を反時計回りに1つずつ配ります' },
                  { icon: '✨', text: '最後の石が自分のマンカラに入ったらボーナスターン', highlight: 'text-green-400' },
                  { icon: '💎', text: '最後の石が自分の空の穴に入ったら、反対側の石をゲット', highlight: 'text-yellow-400' },
                  { icon: '🏁', text: 'どちらかの穴が空になったらゲーム終了' },
                  { icon: '🏆', text: 'マンカラに最も多くの石を集めた方が勝ち！', highlight: 'text-amber-300' },
                ].map((rule, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-lg min-w-[24px]">{rule.icon}</span>
                    <p className={`text-amber-200/60 ${rule.highlight || ''}`}>
                      {rule.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-amber-500/30 text-xs">
            世界最古のボードゲーム • 4000年の歴史
          </div>
        </div>
      </div>
    </div>
  );
}
