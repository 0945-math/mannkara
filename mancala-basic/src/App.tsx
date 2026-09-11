import { useEffect, useState } from 'react';
import {
  Board, Player, createInitialBoard, makeMove, isGameOver, getWinner,
  getValidMoves, getPlayerPits,
} from './game/mancala';

const LABELS = ['1','2','3','4','5','6','G1','8','9','10','11','12','13','G2'];
type Difficulty = 'easy' | 'medium' | 'hard';

function App() {
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [current, setCurrent] = useState<Player>(1);
  const [started, setStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [message, setMessage] = useState('あなたの番です。自分の陣地から穴を選んでください。');
  const [lastMove, setLastMove] = useState<number | null>(null);

  const gameOver = isGameOver(board);
  const winner = gameOver ? getWinner(board) : 0;
  const validMoves = getValidMoves(board, current);

  useEffect(() => {
    if (!started || gameOver || current !== 2) return;
    const timer = window.setTimeout(() => {
      const moves = getValidMoves(board, 2);
      if (!moves.length) return;
      const index = difficulty === 'easy'
        ? Math.floor(Math.random() * moves.length)
        : moves.reduce((best, move, i) => board[move] > board[moves[best]] ? i : best, 0);
      play(moves[index], 2);
    }, difficulty === 'hard' ? 500 : 300);
    return () => window.clearTimeout(timer);
  }, [started, current, board, gameOver, difficulty]);

  function play(pit: number, player: Player) {
    if (!started || gameOver || !getPlayerPits(player).includes(pit) || board[pit] === 0) return;
    const result = makeMove(board, pit, player);
    setBoard(result.newBoard);
    setLastMove(pit);
    if (isGameOver(result.newBoard)) {
      const w = getWinner(result.newBoard);
      setMessage(w === 1 ? 'あなたの勝ちです。' : w === 2 ? 'AIの勝ちです。' : '引き分けです。');
      return;
    }
    const next = result.extraTurn ? player : (player === 1 ? 2 : 1);
    setCurrent(next);
    setMessage(result.extraTurn
      ? `${player === 1 ? 'あなた' : 'AI'}はゴールで終わったので、もう一度です。`
      : next === 1 ? 'あなたの番です。' : 'AIの番です。');
  }

  function reset() {
    setBoard(createInitialBoard());
    setCurrent(1);
    setLastMove(null);
    setMessage('あなたの番です。自分の陣地から穴を選んでください。');
  }

  if (!started) return (
    <main className="start">
      <section className="card">
        <h1>マンカラ・ベーシック</h1>
        <p>日本の一般的な「マンカラ・ベーシック」ルールでAIと対戦します。</p>
        <ul>
          <li>12個のポケットに4個ずつ配置</li>
          <li>両方のゴールに石を入れる</li>
          <li>最後の石がゴールなら同じプレイヤーが続ける</li>
          <li>キャプチャは行わない</li>
          <li>自分の陣地を先に空にした方が勝ち</li>
        </ul>
        <label>AI難易度
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
            <option value="easy">簡単</option>
            <option value="medium">普通</option>
            <option value="hard">難しい</option>
          </select>
        </label>
        <button onClick={() => setStarted(true)}>ゲーム開始</button>
      </section>
    </main>
  );

  const p1 = getPlayerPits(1), p2 = getPlayerPits(2);
  return (
    <main className="game">
      <header><h1>マンカラ・ベーシック</h1><button onClick={reset}>リセット</button></header>
      <p className="message">{message}</p>
      <section className="board">
        <div className="store"><strong>AIゴール</strong><span>{board[13]}</span></div>
        <div className="row ai">{p2.map(p => <Pit key={p} p={p} value={board[p]} disabled />)}</div>
        <div className="row human">{p1.map(p => <Pit key={p} p={p} value={board[p]} disabled={current !== 1 || !validMoves.includes(p) || gameOver} onClick={() => play(p,1)} active={lastMove === p} />)}</div>
        <div className="store"><strong>あなたのゴール</strong><span>{board[6]}</span></div>
      </section>
      <footer>{gameOver ? `結果: ${winner === 1 ? 'あなたの勝ち' : winner === 2 ? 'AIの勝ち' : '引き分け'}` : `難易度: ${difficulty === 'easy' ? '簡単' : difficulty === 'medium' ? '普通' : '難しい'}`}</footer>
    </main>
  );
}

function Pit({ p, value, disabled, onClick, active }: { p:number; value:number; disabled:boolean; onClick?:()=>void; active?:boolean }) {
  return <button className={`pit ${active ? 'active' : ''}`} disabled={disabled} onClick={onClick} aria-label={`穴 ${LABELS[p]}`}><small>{LABELS[p]}</small><strong>{value}</strong></button>;
}

export default App;
