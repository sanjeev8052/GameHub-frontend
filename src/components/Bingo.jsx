import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import confetti from 'canvas-confetti';
import { Trophy, Star, MessageCircle, Send, Users, Shuffle, RotateCcw, GripVertical, Settings, History, Swords, Info, Home as HomeIcon } from 'lucide-react';

const Bingo = ({ gameId, inviteCode, initialPlayers, initialMaxNumber = 75, initialIsSetup = false }) => {
    const { socket, user } = useSocket();
    const scrollRef = useRef(null);

    // Game State
    const [maxNumber, setMaxNumber] = useState(initialMaxNumber);
    const [board, setBoard] = useState([]);
    const [numbersCalled, setNumbersCalled] = useState([]);
    const [turn, setTurn] = useState(null);
    const [status, setStatus] = useState('waiting'); // arena_setup, waiting, starting, playing, over
    const [players, setPlayers] = useState(initialPlayers || {});
    const [countdown, setCountdown] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [winner, setWinner] = useState(null);
    const [winningLines, setWinningLines] = useState([]);
    const [isHost, setIsHost] = useState(false);
    const [isSetup, setIsSetup] = useState(initialIsSetup);

    // Initializing board with Classic Column Logic (No FREE space)
    const initializeBoard = useCallback((max) => {
        const columnSize = Math.floor(max / 5);
        const newBoard = [];
        for (let col = 0; col < 5; col++) {
            const start = col * columnSize + 1;
            const end = (col + 1) * columnSize;
            const pool = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            const selected = pool.sort(() => Math.random() - 0.5).slice(0, 5);
            newBoard[col] = selected;
        }
        const flatBoard = [];
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                flatBoard.push(newBoard[col][row]);
            }
        }
        setBoard(flatBoard);
        setWinningLines([]);
    }, []);

    useEffect(() => {
        initializeBoard(maxNumber);
    }, [maxNumber, initializeBoard]);

    useEffect(() => {
        if (!socket || !players) return;
        const playerIds = Object.keys(players);
        setIsHost(playerIds[0] === socket.id);
        // If host and hasn't setup yet, show Arena Setup
        if (playerIds[0] === socket.id && status === 'waiting' && !isSetup) {
            setStatus('arena_setup');
        }
    }, [socket, players]);

    // Auto-scroll for Battle Log
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [numbersCalled]);

    const checkWin = useCallback((currentBoard, called) => {
        const marked = currentBoard.map(n => called.includes(n));
        let lines = [];
        for (let i = 0; i < 5; i++) {
            if ([0, 1, 2, 3, 4].every(j => marked[i * 5 + j])) lines.push({ type: 'row', index: i });
        }
        for (let i = 0; i < 5; i++) {
            if ([0, 1, 2, 3, 4].every(j => marked[j * 5 + i])) lines.push({ type: 'col', index: i });
        }
        if ([0, 6, 12, 18, 24].every(i => marked[i])) lines.push({ type: 'diag', index: 0 });
        if ([4, 8, 12, 16, 20].every(i => marked[i])) lines.push({ type: 'diag', index: 1 });
        return lines;
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('game-joined', ({ players: gamePlayers, maxNumber: gameMax, isSetup: gameSetup }) => {
            setPlayers(gamePlayers);
            if (gameMax) setMaxNumber(gameMax);
            if (gameSetup !== undefined) setIsSetup(gameSetup);
        });

        socket.on('game-settings-updated', (settings) => {
            if (settings.maxNumber) {
                setMaxNumber(settings.maxNumber);
                initializeBoard(settings.maxNumber);
            }
            if (settings.isSetup) setIsSetup(true);
            setStatus('waiting');
        });

        socket.on('player-ready-update', ({ playerId, ready }) => {
            setPlayers(prev => ({ ...prev, [playerId]: { ...prev[playerId], ready: ready } }));
        });

        socket.on('countdown', (count) => setCountdown(count <= 0 ? null : count));

        socket.on('game-start', ({ turn: firstTurn }) => {
            setTurn(firstTurn);
            setStatus('playing');
        });

        socket.on('number-called', ({ number, nextTurn, numbersCalled: updatedCalled }) => {
            setNumbersCalled(updatedCalled);
            setTurn(nextTurn);
        });

        // Dedicated Win Check Effect to avoid stale closures
        if (status === 'playing' && numbersCalled.length > 0) {
            const lines = checkWin(board, numbersCalled);
            setWinningLines(lines);
            if (lines.length >= 5) {
                console.log("🏆 Win detected locally, declaring to arena...");
                socket.emit('declare-win', gameId);
            }
        }

        socket.on('game-over', ({ name: winnerName, winner: winnerId }) => {
            setStatus('over');
            setWinner(winnerName);
            if (winnerId === socket.id) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        });

        socket.on('game-reset', ({ players: resetPlayers, maxNumber: resetMax }) => {
            setStatus('waiting');
            setNumbersCalled([]);
            setWinningLines([]);
            setPlayers(resetPlayers);
            if (resetMax) setMaxNumber(resetMax);
            initializeBoard(resetMax || maxNumber);
        });

        socket.on('receive-chat', (msg) => {
            const enrichedMsg = {
                ...msg,
                isMe: msg.username === user.username
            };
            setMessages(prev => [...prev.slice(-20), enrichedMsg]);
        });

        return () => {
            socket.off('game-joined');
            socket.off('game-settings-updated');
            socket.off('player-ready-update');
            socket.off('countdown');
            socket.off('game-start');
            socket.off('number-called');
            socket.off('game-over');
            socket.off('game-reset');
            socket.off('receive-chat');
        };
    }, [socket, board, maxNumber, initializeBoard, checkWin, gameId]);

    // Dedicated Win Check Effect to avoid stale closures and state update loops
    useEffect(() => {
        if (status === 'playing' && numbersCalled.length > 0) {
            const lines = checkWin(board, numbersCalled);
            setWinningLines(lines);
            if (lines.length >= 5) {
                console.log("🏆 Win detected locally, declaring to arena...");
                socket.emit('declare-win', gameId);
            }
        }
    }, [numbersCalled, board, status, gameId, socket, checkWin]);

    const handleUpdateSettings = (newMax) => {
        isHost && socket.emit('update-game-settings', { gameId, settings: { maxNumber: newMax } });
    };

    const handleReplay = () => socket.emit('replay-game', { gameId });
    const setReady = () => socket.emit('player-ready', { gameId, board });
    const handleShuffle = () => {
        initializeBoard(maxNumber);
        // If we were ready, we need to un-ready on the server so we can sync the new board
        if (players[socket.id]?.ready) {
            socket.emit('player-unready', { gameId });
        }
    };

    const sendChat = (e) => {
        e.preventDefault();
        if (chatInput.trim()) {
            socket.emit('send-chat', { gameId, message: chatInput });
            setChatInput('');
        }
    };

    const isMarked = (num) => numbersCalled.includes(num);

    const renderLines = () => {
        return winningLines.map((line, i) => {
            const style = {};
            if (line.type === 'row') {
                style.top = `${line.index * 20 + 10}%`;
                style.left = '5%'; style.width = '90%'; style.height = '4px';
            } else if (line.type === 'col') {
                style.left = `${line.index * 20 + 10}%`;
                style.top = '5%'; style.height = '90%'; style.width = '4px';
            } else if (line.type === 'diag') {
                style.width = '120%'; style.height = '4px'; style.top = '50%'; style.left = '-10%';
                style.transform = line.index === 0 ? 'rotate(45deg)' : 'rotate(-45deg)';
            }
            return <div key={i} className="win-line" style={style} />;
        });
    };

    const headers = ['B', 'I', 'N', 'G', 'O'];

    // --- Specialized Renderers ---

    if (status === 'arena_setup' && isHost) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6">
                <div className="glass max-w-2xl w-full p-12 rounded-[3.5rem] border-white/5 space-y-12 text-center animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <div className="space-y-4">
                        <div className="w-20 h-20 bg-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-rose-600/20 rotate-12">
                            <Settings size={40} className="text-white" />
                        </div>
                        <h2 className="text-5xl font-black italic tracking-tighter text-white">ARENA SETUP</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">As host, configure the bingo target range</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {[25, 50, 75].map(v => (
                            <button key={v} onClick={() => handleUpdateSettings(v)}
                                className="group relative p-8 rounded-[2.5rem] border-2 border-white/5 hover:border-rose-500 transition-all bg-slate-900/50 overflow-hidden active:scale-95">
                                <div className="absolute inset-0 bg-rose-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                <span className="block text-4xl font-black text-white mb-1">{v}</span>
                                <span className="block text-[10px] font-black text-slate-500 group-hover:text-rose-400">NUMBERS</span>
                            </button>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-white/5">
                        <p className="text-xs text-slate-600 font-bold italic">Room Code: <span className="text-rose-500">{inviteCode}</span></p>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'over') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-center space-y-8 p-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-rose-600 blur-[120px] opacity-20 animate-pulse"></div>
                    <Trophy size={200} className="text-yellow-500 drop-shadow-3xl animate-bounce relative z-10" />
                </div>
                <h2 className="text-8xl font-black italic text-white tracking-tighter uppercase">{winner === user?.name ? 'YOU WIN!' : `${winner} WINS`}</h2>
                <div className="space-y-1">
                    <p className="text-2xl font-bold text-slate-400 uppercase tracking-widest">{winner === user?.name ? 'CHAMPION DETECTED' : 'VICTOR EMERGED'}</p>
                    <p className="text-5xl font-black text-rose-500 italic uppercase">{winner === user?.name ? 'YOU ARE THE ONE' : 'ACED THE ARENA'}</p>
                </div>
                <div className="flex gap-4 pt-10">
                    <button onClick={handleReplay} className="btn-primary py-6 px-16 text-2xl font-black rounded-3xl bg-blue-600 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">REPLAY</button>
                    <button onClick={() => window.location.reload()} className="bg-white/5 border border-white/10 py-6 px-16 text-2xl font-black rounded-3xl hover:bg-white/10 active:scale-95 transition-all">EXIT</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-y-auto overflow-x-hidden transition-all duration-500 pb-8 safe-bottom">
            {/* Professional Top Bar - Responsive Padding and Stacking */}
            <div className="bg-slate-900/90 backdrop-blur-2xl border-b border-white/10 px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 z-30 sticky top-0">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 tracking-[0.4em] uppercase">Private Match</span>
                        <span className="text-2xl font-black tracking-widest text-white italic">{inviteCode || 'BATTLE'}</span>
                    </div>
                    <div className="h-8 w-px bg-white/5"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 tracking-[0.4em] uppercase">Target Max</span>
                        <span className="text-2xl font-black text-rose-500">{maxNumber}</span>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-1 md:gap-3 shrink-0">
                    {headers.map((h, i) => (
                        <div key={i} className={`aspect-square flex items-center justify-center text-3xl md:text-6xl font-black italic transition-all duration-700
                                        ${winningLines.length > i ? 'text-white drop-shadow-glow scale-110' : 'text-slate-800'}`}>
                            {h}
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all group active:scale-95"
                    >
                        <HomeIcon size={18} className="text-slate-400 group-hover:text-white transition-colors" />
                        <span className="hidden md:block text-[10px] font-black tracking-widest uppercase text-slate-400 group-hover:text-white">Home</span>
                    </button>
                    <div className="flex flex-col items-center sm:items-end">
                        <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Committing as</span>
                        <span className="text-xs md:text-sm font-black text-rose-400">{user?.name}</span>
                    </div>
                </div>
            </div>

            {/* Arena Grid (Responsive Columns) */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
                {/* Left Panel: Players & Chat */}
                <div className="w-full lg:w-80 border-b lg:border-r border-white/5 flex flex-col shrink-0 bg-slate-900/20">
                    <div className="p-6 flex-1 flex flex-col overflow-hidden">
                        <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Swords size={12} /> Combatants
                        </h3>
                        <div className="space-y-2 overflow-y-auto mb-8 pr-2 custom-scrollbar">
                            {Object.values(players).map(p => (
                                <div key={p.id} className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${p.id === socket.id ? 'bg-rose-600/10 border-rose-500/20' : 'bg-slate-900/50 border-white/5'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${p.ready ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-slate-800 animate-pulse'}`}></div>
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-black transition-colors ${p.id === socket.id ? 'text-rose-500' : 'text-slate-300'}`}>{p.name}</span>
                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">ID: {p.id.substring(0, 8)}</span>
                                        </div>
                                    </div>
                                    {p.id === turn && status === "playing" && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>}
                                </div>
                            ))}
                        </div>

                        <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2 pt-4 border-t border-white/5">
                            <MessageCircle size={12} /> Comms
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[9px] font-black text-slate-600 mb-1">{m.name || m.username}</span>
                                    <p className={`px-4 py-2 rounded-2xl text-xs max-w-[90%] break-words ${m.isMe ? 'bg-rose-600 text-white rounded-tr-none' : 'bg-slate-800/80 text-slate-400 rounded-tl-none'}`}>
                                        {m.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendChat} className="mt-4 flex gap-2">
                            <input className="flex-1 bg-slate-950 border border-white/5 rounded-2xl px-4 py-3 text-sm outline-none focus:border-rose-500/50 transition-colors" placeholder="Message..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
                            <button className="bg-rose-600 hover:bg-rose-500 p-3 rounded-2xl transition-all active:scale-90 shadow-lg shadow-rose-600/10"><Send size={18} /></button>
                        </form>
                    </div>
                </div>

                {/* Center Panel: The Board (Fluid & Responsive Scaling) */}
                <div className="flex-1 flex flex-col items-center justify-center relative p-3 md:p-6 lg:p-8 min-h-[400px] lg:h-full">
                    {/* Responsive Background Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.01] pointer-events-none overflow-hidden select-none">
                        <span className="text-[25vw] sm:text-[20vw] lg:text-[400px] font-black italic tracking-tighter">BINGO</span>
                    </div>

                    <div className="relative group w-full max-w-[min(650px,95vw,60vh)] shrink-0 flex flex-col items-center">

                        <div className="relative w-full aspect-square bg-slate-900/90 p-1 md:p-4 rounded-[1rem] md:rounded-[1rem] border-2 md:border-[10px] border-slate-900 shadow-3xl">
                            <div className="absolute -inset-10 bg-rose-600/5 blur-[100px] pointer-events-none opacity-50"></div>

                            {/* Main Grid with Tiny/Adaptive Spacing */}
                            <div className="h-full relative z-20">
                                {renderLines()}
                                <div className="grid grid-cols-5 gap-1 md:gap-3 h-full">
                                    {board.map((num, i) => (
                                        <button key={i}
                                            onClick={() => status === 'playing' && turn === socket.id && !isMarked(num) && socket.emit('call-number', { gameId, number: num })}
                                            className={`aspect-square rounded-sm md:rounded-xl text-sm sm:text-xl md:text-2xl lg:text-2xl font-black transition-all flex items-center justify-center relative
                                                ${isMarked(num)
                                                    ? 'bg-rose-600 text-white shadow-2xl z-20 '
                                                    : 'bg-slate-950/80 text-slate-500 border border-white/5 hover:border-white/10 hover:scale-105 active:scale-95'}
                                                ${status === 'playing' && turn === socket.id && !isMarked(num) ? 'cursor-pointer' : 'pointer-events-none'}
                                            `}>
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 md:mt-15 text-center space-y-1 md:space-y-2">
                        <div className={`text-xl sm:text-2xl md:text-4xl font-black italic tracking-tighter uppercase ${turn === socket.id ? 'text-rose-500 drop-shadow-glow animate-pulse' : 'text-slate-800'}`}>
                            {status === 'playing' ? (turn === socket.id ? 'YOUR STRIKE' : 'OPPONENT TAKING AIM...') : 'Waiting...'}
                        </div>
                        {status === 'waiting' && (
                            <div className="flex gap-2 sm:gap-4 pt-2 md:pt-4 animate-in slide-in-from-bottom-4 duration-500">
                                <button onClick={handleShuffle} className="bg-slate-900/80 border border-white/5 px-4 md:px-8 py-2 md:py-4 rounded-xl md:rounded-3xl font-black text-[8px] md:text-xs tracking-widest uppercase hover:bg-slate-800 flex items-center gap-2 md:gap-3 transition-all active:scale-95">SHUFFLE</button>
                                <button onClick={setReady} disabled={players[socket.id]?.ready}
                                    className={`px-6 md:px-12 py-2 md:py-4 rounded-xl md:rounded-3xl font-black text-[10px] md:text-xs tracking-widest uppercase shadow-xl transition-all active:scale-95 ${players[socket.id]?.ready ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/20'}`}>
                                    {players[socket.id]?.ready ? 'READY' : "I'M READY"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Battle Log */}
                <div className="w-full lg:w-64 border-t lg:border-l border-white/5 flex flex-col bg-slate-900/20 shrink-0">
                    <div className="p-6 flex flex-col h-full">
                        <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <History size={12} /> Battle Log
                        </h3>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {numbersCalled.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 filter grayscale">
                                    <Swords size={40} className="mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting First Strike</p>
                                </div>
                            ) : (
                                [...numbersCalled].reverse().map((num, i) => (
                                    <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-500 ${i === 0 ? 'bg-rose-600 border-rose-500 shadow-lg scale-105' : 'bg-slate-900/50 border-white/5 opacity-50'}`}>
                                        <span className="text-2xl font-black italic">{num}</span>
                                        <span className="text-[8px] font-black uppercase opacity-60">{i === 0 ? 'LATEST' : `#${numbersCalled.length - i}`}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/5 text-center">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</p>
                            <div className="flex justify-center gap-1 mt-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={`w-2 h-2 rounded-full transition-all duration-500 ${winningLines.length >= i ? 'bg-rose-500 shadow-[0_0_8px_rose]' : 'bg-slate-800'}`}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Countdown Overlay */}
            {countdown !== null && (
                <div className="fixed inset-0 bg-slate-950/95 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative">
                        <div className="absolute inset-0 bg-rose-600 blur-[150px] opacity-30 animate-pulse"></div>
                        <span className="text-[350px] font-black italic text-white drop-shadow-glow animate-ping relative z-10">
                            {countdown}
                        </span>
                    </div>
                    <p className="text-2xl font-black tracking-[1em] text-slate-500 uppercase mt-[-50px] relative z-10">Infiltrating</p>
                </div>
            )}

            {/* User Access Identification */}
            <div className="fixed bottom-2 right-4 opacity-20 pointer-events-none select-none z-[100]">
                <span className="text-[10px] font-black text-slate-500 tracking-tighter uppercase whitespace-nowrap">Node_Access_ID: {socket?.id}</span>
            </div>
        </div>
    );
};

export default Bingo;
