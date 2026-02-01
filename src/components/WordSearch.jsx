import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import confetti from 'canvas-confetti';
import { Search, Timer, Trophy, CheckCircle2 } from 'lucide-react';

const WordSearch = ({ gameId, initialSize }) => {
    const { socket, user } = useSocket();
    const [grid, setGrid] = useState([]);
    const [words, setWords] = useState([]);
    const [foundWords, setFoundWords] = useState([]);
    const [status, setStatus] = useState('waiting');
    const [selection, setSelection] = useState([]);
    const [players, setPlayers] = useState({});
    const [countdown, setCountdown] = useState(null);
    const [winner, setWinner] = useState(null);
    const [size, setSize] = useState(initialSize || 10);
    const [opponentProgress, setOpponentProgress] = useState(0);

    useEffect(() => {
        if (!socket) return;

        socket.on('game-joined', ({ size: gameSize }) => {
            setSize(gameSize);
        });

        socket.on('countdown', (count) => {
            if (count <= 0) setCountdown(null);
            else setCountdown(count);
        });

        socket.on('game-start', ({ grid: gameGrid, words: gameWords, size: gameSize }) => {
            setGrid(gameGrid);
            setWords(gameWords);
            setSize(gameSize);
            setStatus('playing');
            setFoundWords([]);
        });

        socket.on('opponent-progress', (progress) => {
            setOpponentProgress(progress);
        });

        socket.on('game-over', ({ username: winnerName, winner: winnerId }) => {
            setStatus('over');
            setWinner(winnerName);
            if (winnerId === socket.id) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        });

        return () => {
            socket.off('game-joined');
            socket.off('countdown');
            socket.off('game-start');
            socket.off('opponent-progress');
            socket.off('game-over');
        };
    }, [socket]);

    const handleCellClick = (r, c) => {
        if (status !== 'playing') return;

        const lastSelected = selection[selection.length - 1];
        if (lastSelected && lastSelected.r === r && lastSelected.c === c) {
            setSelection([]);
            return;
        }

        const newSelection = [...selection, { r, c }];
        setSelection(newSelection);

        const selectedWord = newSelection.map(s => grid[s.r][s.c]).join('');
        if (words.includes(selectedWord) && !foundWords.includes(selectedWord)) {
            const updated = [...foundWords, selectedWord];
            setFoundWords(updated);
            setSelection([]);

            const progress = (updated.length / words.length) * 100;
            socket.emit('word-found', { gameId, word: selectedWord, progress });

            if (updated.length === words.length) {
                socket.emit('declare-win', gameId);
            }
        } else if (newSelection.length > 15) {
            setSelection([]);
        }
    };

    const isSelected = (r, c) => selection.some(s => s.r === r && s.c === c);

    if (status === 'over') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                <Trophy size={100} className="text-yellow-500 animate-bounce" />
                <h2 className="text-5xl font-black">PUZZLE SOLVED!</h2>
                <p className="text-2xl font-bold text-slate-400">Winner: <span className="text-blue-500">{winner}</span></p>
                <button onClick={() => window.location.reload()} className="btn-primary px-10">LOBBY</button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto w-full px-4 py-8 grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="glass p-6 rounded-3xl border-white/5 space-y-4">
                    <h3 className="text-xl font-black flex items-center gap-2">
                        <Search className="text-blue-500" size={20} />
                        WORDS
                    </h3>
                    <div className="flex flex-col gap-2">
                        {words.map((word, i) => (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${foundWords.includes(word) ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-slate-900/40 border-white/5 text-slate-400'}`}>
                                <span className="text-sm font-black tracking-widest">{word}</span>
                                {foundWords.includes(word) && <CheckCircle2 size={16} />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass p-6 rounded-3xl border-white/5">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Opponent Progress</h4>
                    <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-rose-500 transition-all duration-500 rounded-full"
                            style={{ width: `${opponentProgress}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-3 space-y-8">
                {countdown !== null && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                        <span className="text-[150px] font-black italic text-blue-500 animate-pulse">{countdown}</span>
                    </div>
                )}

                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black uppercase tracking-tighter">WORD FIND</h2>
                        <p className="text-slate-400 font-medium flex items-center gap-2">
                            <Timer size={16} />
                            FOUND {foundWords.length} OF {words.length} WORDS
                        </p>
                    </div>
                    {status === 'waiting' && (
                        <div className="px-6 py-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 font-bold animate-pulse">
                            WAITING FOR PLAYERS...
                        </div>
                    )}
                </div>

                <div
                    className="grid gap-1.5 p-4 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-2xl mx-auto touch-none"
                    style={{
                        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                        maxWidth: `${size * 45}px`
                    }}
                >
                    {grid.map((row, r) => (
                        row.map((char, c) => (
                            <button
                                key={`${r}-${c}`}
                                onClick={() => handleCellClick(r, c)}
                                className={`aspect-square sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-lg font-black transition-all transform
                                    ${isSelected(r, c) ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40 scale-110 z-10' : 'bg-slate-800/40 hover:bg-slate-700/60 text-slate-300'}
                                    active:scale-90
                                `}
                            >
                                {char}
                            </button>
                        ))
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WordSearch;
