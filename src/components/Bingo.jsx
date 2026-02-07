import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import confetti from 'canvas-confetti';
import { Trophy, Star, MessageCircle, Send, Users, Shuffle, RotateCcw, GripVertical, Settings, History, Swords, Info, Home as HomeIcon, Volume2, VolumeX, Music, ChevronDown, Mic, MicOff } from 'lucide-react';
import VoiceChat from './VoiceChat';

// Audio Assets
import winSound from '../assets/music/do_what_you_want-bomb-explosion-469038.mp3';
import lossSound from '../assets/music/ladle-meoww-ghop-ghop-ghop.mp3';
import knifeSound from '../assets/music/line-complete/knife-draw.mp3';
import faaahSound from '../assets/music/line-complete/faaah.mp3';

const Bingo = ({ gameId, inviteCode, initialPlayers, initialMaxNumber = 75, initialIsSetup = false }) => {
    const { socket, user } = useSocket();
    const scrollRef = useRef(null);
    const horizontalScrollRef = useRef(null);

    // Audio Refs
    const winAudio = useRef(new Audio(winSound));
    const lossAudio = useRef(new Audio(lossSound));
    const knifeAudio = useRef(new Audio(knifeSound));
    const faaahAudio = useRef(new Audio(faaahSound));

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

    // Sound State
    const [isMuted, setIsMuted] = useState(false);
    const [isVoiceMuted, setIsVoiceMuted] = useState(true); // Default voice to muted
    const [selectedLineSound, setSelectedLineSound] = useState('Knife cut'); // 'Knife cut' or 'faaah'
    const [isSoundMenuOpen, setIsSoundMenuOpen] = useState(false);

    // Initializing board with Classic Column Logic (No FREE space)
    // Sound Logic: Line Completion
    const lastLineCount = useRef(0);
    useEffect(() => {
        if (winningLines.length > lastLineCount.current) {
            if (winningLines.length < 5 && !isMuted) {
                const sound = selectedLineSound === 'Knife cut' ? knifeAudio.current : faaahAudio.current;
                sound.currentTime = 0;
                sound.play().catch(e => console.log("Audio play failed:", e));
            }
        }
        lastLineCount.current = winningLines.length;
    }, [winningLines.length, isMuted, selectedLineSound]);

    // Reset line count on game start/reset
    useEffect(() => {
        if (status === 'starting' || status === 'waiting') {
            lastLineCount.current = 0;
        }
    }, [status]);

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

    // Auto-scroll for horizontal Called Numbers (Mobile)
    useEffect(() => {
        if (horizontalScrollRef.current) {
            horizontalScrollRef.current.scrollTo({
                left: horizontalScrollRef.current.scrollWidth,
                behavior: 'smooth'
            });
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
            console.log(`BINGO OVER: Winner is ${winnerName} (${winnerId}). My ID: ${socket.id}`);

            if (winnerId === socket.id) {
                console.log("🏆 Result: Victory sound triggered");
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                if (!isMuted) {
                    lossAudio.current.pause(); // Ensure no meow is playing
                    winAudio.current.currentTime = 0;
                    winAudio.current.play().catch(e => console.log("Audio play failed:", e));
                }
            } else {
                console.log("💀 Result: Defeat sound triggered");
                if (!isMuted) {
                    winAudio.current.pause(); // Ensure no explosion is playing
                    lossAudio.current.currentTime = 0;
                    lossAudio.current.play().catch(e => console.log("Audio play failed:", e));
                }
            }
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 md:p-6">
                <div className="glass max-w-2xl w-full p-8 md:p-12 rounded-3xl md:rounded-[3.5rem] border-white/5 space-y-8 md:space-y-12 text-center animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <div className="space-y-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-600 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-rose-600/20 rotate-12">
                            <Settings size={32} className="text-white md:w-10 md:h-10" />
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white">ARENA SETUP</h2>
                        <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">As host, configure the bingo target range</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                        {[25, 50, 75].map(v => (
                            <button key={v} onClick={() => handleUpdateSettings(v)}
                                className="group relative p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border-2 border-white/5 hover:border-rose-500 transition-all bg-slate-900/50 overflow-hidden active:scale-95">
                                <div className="absolute inset-0 bg-rose-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                <span className="block text-2xl md:text-4xl font-black text-white mb-1">{v}</span>
                                <span className="block text-[8px] md:text-[10px] font-black text-slate-500 group-hover:text-rose-400">NUMBERS</span>
                            </button>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-white/5">
                        <p className="text-[10px] md:text-xs text-slate-600 font-bold italic">Room Code: <span className="text-rose-500">{inviteCode}</span></p>
                    </div>
                </div>
            </div>
        );
    }


    if (status === 'over') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-center space-y-6 md:space-y-8 p-4 md:p-6 overflow-hidden">
                <div className="relative">
                    <div className="absolute inset-0 bg-rose-600 blur-[80px] md:blur-[120px] opacity-20 animate-pulse"></div>
                    <Trophy className="text-yellow-500 drop-shadow-3xl animate-bounce relative z-10 w-32 h-32 md:w-48 md:h-48" />
                </div>
                <h2 className="text-4xl md:text-8xl font-black italic text-white tracking-tighter uppercase leading-none px-4">
                    {winner === user?.name ? 'YOU WIN!' : `${winner} WINS`}
                </h2>
                <div className="space-y-1 px-4">
                    <p className="text-lg md:text-2xl font-bold text-slate-400 uppercase tracking-widest leading-tight">{winner === user?.name ? 'CHAMPION DETECTED' : 'VICTOR EMERGED'}</p>
                    <p className="text-2xl md:text-5xl font-black text-rose-500 italic uppercase leading-tight">{winner === user?.name ? 'YOU ARE THE ONE' : 'ACED THE ARENA'}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-6 md:pt-10 w-full max-w-md px-6">
                    <button onClick={handleReplay} className="flex-1 btn-primary py-4 md:py-6 px-8 md:px-16 text-xl md:text-2xl font-black rounded-2xl md:rounded-3xl bg-blue-600 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">REPLAY</button>
                    <button onClick={() => window.location.reload()} className="flex-1 bg-white/5 border border-white/10 py-4 md:py-6 px-8 md:px-16 text-xl md:text-2xl font-black rounded-2xl md:rounded-3xl hover:bg-white/10 active:scale-95 transition-all">EXIT</button>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-y-auto lg:overflow-hidden transition-all duration-500 pb-8 safe-bottom">
            {/* Professional Top Bar - Responsive Padding and Stacking */}
            <div className="bg-slate-900/90 backdrop-blur-2xl border-b border-white/10 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-4 shrink-0 z-50 sticky top-0">
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="flex flex-col">
                        <span className="text-[8px] md:text-[10px] font-black text-slate-500 tracking-[0.2em] md:tracking-[0.4em] uppercase">Private Match</span>
                        <span className="text-lg md:text-2xl font-black tracking-widest text-white italic">{inviteCode || 'BATTLE'}</span>
                    </div>
                    <div className="h-6 md:h-8 w-px bg-white/5"></div>
                    <div className="flex flex-col">
                        <span className="text-[8px] md:text-[10px] font-black text-slate-500 tracking-[0.2em] md:tracking-[0.4em] uppercase">Target</span>
                        <span className="text-lg md:text-2xl font-black text-rose-500">{maxNumber}</span>
                    </div>
                </div>

                <div className="hidden sm:grid grid-cols-5 gap-1 md:gap-3 shrink-0">
                    {headers.map((h, i) => (
                        <div key={i} className={`aspect-square flex items-center justify-center text-3xl md:text-6xl font-black italic transition-all duration-700
                                        ${winningLines.length > i ? 'text-white drop-shadow-glow scale-110' : 'text-slate-800'}`}>
                            {h}
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Sound Controls */}
                    <div className="relative flex items-center gap-1 md:gap-2 bg-white/5 p-1 rounded-full border border-white/5">
                        <button
                            onClick={() => setIsMuted(prev => !prev)}
                            className={`p-1.5 md:p-2 rounded-full transition-all ${isMuted ? 'text-slate-500' : 'text-rose-500 bg-rose-500/10'}`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <VolumeX size={14} className="md:w-4 md:h-4" /> : <Volume2 size={14} className="md:w-4 md:h-4" />}
                        </button>

                        <div className="h-4 w-px bg-white/10"></div>

                        <div className="relative">
                            <button
                                onClick={() => setIsSoundMenuOpen(!isSoundMenuOpen)}
                                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                            >
                                <Music size={12} className="shrink-0" />
                                <span className="truncate max-w-[40px] md:max-w-none">{selectedLineSound === 'Knife cut' ? 'KNIFE' : 'FAAAH'}</span>
                                <ChevronDown size={10} className={`transition-transform shrink-0 ${isSoundMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSoundMenuOpen && (
                                <div className="absolute top-full mt-2 right-0 w-32 glass rounded-xl border-white/10 py-2 z-[60] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                    {['Knife cut', 'faaah'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => {
                                                setSelectedLineSound(s);
                                                setIsSoundMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${selectedLineSound === s ? 'text-rose-500' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mic Controls */}
                    <button
                        onClick={() => setIsVoiceMuted(prev => !prev)}
                        className={`p-1.5 md:p-2 rounded-full transition-all flex items-center gap-2 border ${isVoiceMuted ? 'text-slate-500 bg-slate-500/10 border-slate-500/20' : 'text-green-500 bg-green-500/10 border-green-500/20 shadow-[0_0_10px_#22c55e20]'}`}
                        title={isVoiceMuted ? "Unmute Mic" : "Mute Mic"}
                    >
                        {isVoiceMuted ? <MicOff size={16} className="md:w-[18px] md:h-[18px]" /> : <Mic size={16} className="md:w-[18px] md:h-[18px]" />}
                        <span className="hidden md:block text-[10px] font-black tracking-widest uppercase">
                            {isVoiceMuted ? 'Muted' : 'Live'}
                        </span>
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-1"></div>

                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all group active:scale-95"
                    >
                        <HomeIcon size={16} className="text-slate-400 group-hover:text-white transition-colors md:w-[18px] md:h-[18px]" />
                        <span className="hidden md:block text-[10px] font-black tracking-widest uppercase text-slate-400 group-hover:text-white">Home</span>
                    </button>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest hidden md:block">Playing as</span>
                        <span className="text-xs md:text-sm font-black text-rose-400 truncate max-w-[60px] md:max-w-none">{user?.name}</span>
                    </div>
                </div>
            </div>

            {/* Arena Grid (Responsive Columns) */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
                {/* Left Panel: Players & Chat (Hidden on Mobile) */}
                <div className="hidden lg:flex w-full lg:w-80 border-b lg:border-r border-white/5 flex-col shrink-0 bg-slate-900/20">
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
                <div className="flex-1 flex flex-col items-center justify-start lg:justify-center relative p-3 md:p-6 lg:p-8 min-h-[400px] lg:h-full">

                    {/* Horizontal Called Numbers Row (Mobile Only) */}
                    <div className="lg:hidden w-full px-4 pt-6 pb-2">
                        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2"><History size={12} /> Recent Hits</span>
                            <span className="text-rose-500 font-bold">{numbersCalled.length} Drawn</span>
                        </div>
                        <div
                            ref={horizontalScrollRef}
                            className="flex gap-2 overflow-x-auto pb-4 scroll-smooth hide-scrollbar no-scrollbar"
                            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                        >
                            {numbersCalled.length === 0 ? (
                                <p className="text-[10px] text-slate-700 font-black uppercase py-2 tracking-widest italic flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-slate-800 rounded-full animate-pulse"></span>
                                    Awaiting First Strike...
                                </p>
                            ) : (
                                numbersCalled.map((num, i) => (
                                    <div key={i} className={`flex-shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-500 ${i === numbersCalled.length - 1 ? 'bg-rose-600 border-rose-500 shadow-lg shadow-rose-600/20 scale-105 z-10' : 'bg-slate-900/50 border-white/5 opacity-40'}`}>
                                        <span className="text-xl font-black italic">{num}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Mobile Progress Bar (Optional replacement for B-I-N-G-O headers on mobile) */}
                    <div className="lg:hidden flex justify-center gap-2 mb-6">
                        {headers.map((h, i) => (
                            <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black italic transition-all duration-500 ${winningLines.length > i ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-900 text-slate-800 border border-white/5'}`}>
                                {h}
                            </div>
                        ))}
                    </div>

                    {/* Responsive Background Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.01] pointer-events-none overflow-hidden select-none">
                        <span className="text-[25vw] sm:text-[20vw] lg:text-[400px] font-black italic tracking-tighter">BINGO</span>
                    </div>

                    <div className="relative group w-full max-w-[min(550px,95vw,60vh)] shrink-0 flex flex-col items-center">

                        <div className="relative w-full aspect-square bg-slate-900/90 p-1 md:p-4 rounded-[0.6rem] md:rounded-[2rem] border-2 md:border-[10px] border-slate-900 shadow-3xl">
                            <div className="absolute -inset-10 bg-rose-600/5 blur-[100px] pointer-events-none opacity-50"></div>

                            {/* Main Grid with Tiny/Adaptive Spacing */}
                            <div className="h-full relative z-20">
                                {renderLines()}
                                <div className="grid grid-cols-5 gap-2 md:gap-3 h-full">
                                    {board.map((num, i) => (
                                        <button key={i}
                                            onClick={() => status === 'playing' && turn === socket.id && !isMarked(num) && socket.emit('call-number', { gameId, number: num })}
                                            className={`aspect-square rounded-lg md:rounded-xl text-lg sm:text-xl md:text-2xl lg:text-2xl font-black transition-all flex items-center justify-center relative
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

                    <div className="mt-8 md:mt-15 text-center space-y-1 md:space-y-2">
                        <div className={`text-xl sm:text-2xl md:text-4xl font-black italic tracking-tighter uppercase ${turn === socket.id ? 'text-rose-500 drop-shadow-glow animate-pulse' : 'text-slate-800'}`}>
                            {status === 'playing' ? (turn === socket.id ? 'YOUR STRIKE' : 'OPPONENT TAKING AIM...') : 'Waiting...'}
                        </div>
                        {status === 'waiting' && (
                            <div className="flex gap-2 sm:gap-4 pt-2 md:pt-4 animate-in slide-in-from-bottom-4 duration-500">
                                <button onClick={handleShuffle} className="bg-slate-900/80 border border-white/5 px-4 md:px-8 py-2 md:py-4 rounded-xl md:rounded-3xl font-black text-[10px] md:text-xs tracking-widest uppercase hover:bg-slate-800 flex items-center gap-2 md:gap-3 transition-all active:scale-95">SHUFFLE</button>
                                <button onClick={setReady} disabled={players[socket.id]?.ready}
                                    className={`px-8 md:px-12 py-2 md:py-4 rounded-xl md:rounded-3xl font-black text-[10px] md:text-xs tracking-widest uppercase shadow-xl transition-all active:scale-95 ${players[socket.id]?.ready ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/20'}`}>
                                    {players[socket.id]?.ready ? 'READY' : "I'M READY"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Battle Log (Hidden on Mobile) */}
                <div className="hidden lg:flex w-full lg:w-64 border-t lg:border-l border-white/5 flex-col bg-slate-900/20 shrink-0">
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
                <div className="fixed inset-0 bg-slate-950/95 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-300 px-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-rose-600 blur-[150px] opacity-30 animate-pulse"></div>
                        <span className="text-[150px] md:text-[350px] font-black italic text-white drop-shadow-glow animate-ping relative z-10 leading-none">
                            {countdown}
                        </span>
                    </div>
                    <p className="text-lg md:text-2xl font-black tracking-[0.5em] md:tracking-[1em] text-slate-500 uppercase mt-[-10px] md:mt-[-50px] relative z-10">Infiltrating</p>
                </div>
            )}

            {/* Voice Logic */}
            {socket && (
                <VoiceChat
                    socket={socket}
                    gameId={gameId}
                    players={players}
                    isMuted={isVoiceMuted}
                />
            )}

            {/* User Access Identification */}
            <div className="fixed bottom-2 right-4 opacity-10 pointer-events-none select-none z-[100] hidden sm:block">
                <span className="text-[8px] md:text-[10px] font-black text-slate-500 tracking-tighter uppercase whitespace-nowrap">Node_Access_ID: {socket?.id}</span>
            </div>
        </div>
    );

};

export default Bingo;
