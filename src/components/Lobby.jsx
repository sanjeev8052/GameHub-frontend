import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Trophy, Users, PlusCircle, Gamepad2 } from 'lucide-react';

const Lobby = () => {
    const { onlineUsers, availableRooms, user, login, socket } = useSocket();
    const [username, setUsername] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        login(username);
    };

    const createRoom = (gameType) => {
        const gameId = `${gameType}-${Math.random().toString(36).substr(2, 5)}`;
        socket.emit('join-game', { gameId, gameType });
    };

    const joinRoom = (gameId, gameType) => {
        socket.emit('join-game', { gameId, gameType });
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
                <div className="glass p-10 rounded-[2.5rem] w-full max-w-md text-center space-y-8 border-rose-500/20 shadow-2xl shadow-rose-500/10">
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50">
                            GAME HUB
                        </h1>
                        <p className="text-slate-400 font-medium">Enter your alias to enter the arena</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Username"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-rose-500 outline-none transition-all text-lg"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <button type="submit" className="w-full btn-primary py-4 text-lg rounded-2xl shadow-rose-500/20">
                            ENTER LOBBY
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto w-full space-y-10 py-10 px-6">
            <header className="flex justify-between items-end">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tight">THE LOBBY</h2>
                    <p className="text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        {onlineUsers.length} Players Online
                    </p>
                </div>
                <div className="glass px-6 py-3 rounded-2xl border-rose-500/20">
                    <span className="text-slate-400 text-sm font-medium mr-2">LOGGED IN AS</span>
                    <span className="text-rose-400 font-bold uppercase">{user.username}</span>
                </div>
            </header>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Game Modes */}
                <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                    <div className="glass p-8 rounded-[2rem] border-rose-500/20 space-y-6 card-hover group relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-rose-500/10 scale-150 rotate-12 transition-transform group-hover:rotate-0">
                            <Gamepad2 size={120} />
                        </div>
                        <div className="space-y-2 relative">
                            <h3 className="text-3xl font-black text-rose-500">BINGO</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Experience the classic thrill of Bingo in real-time. Call numbers and complete 5 lines to win!
                            </p>
                        </div>
                        <button onClick={() => createRoom('bingo')} className="btn-primary w-full py-4 relative">
                            CREATE BINGO ROOM
                        </button>
                    </div>

                    <div className="glass p-8 rounded-[2rem] border-blue-500/20 space-y-6 card-hover group relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-blue-500/10 scale-150 rotate-12 transition-transform group-hover:rotate-0">
                            <PlusCircle size={120} />
                        </div>
                        <div className="space-y-2 relative">
                            <h3 className="text-3xl font-black text-blue-400">WORD FIND</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Test your eyes and speed in this word search challenge. Race to find all words first!
                            </p>
                        </div>
                        <button onClick={() => createRoom('wordsearch')} className="btn-secondary w-full py-4 text-white hover:bg-slate-600 border border-white/5 relative">
                            CREATE SEARCH ROOM
                        </button>
                    </div>
                </div>

                {/* Active Rooms */}
                <div className="glass rounded-[2rem] p-8 space-y-6 flex flex-col h-full border-white/5 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
                            <Users size={20} />
                        </div>
                        <h3 className="text-xl font-bold">ACTIVE ROOMS</h3>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {availableRooms.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-10 opacity-50">
                                <Trophy size={40} />
                                <p className="text-sm font-medium">No active games found</p>
                            </div>
                        ) : (
                            availableRooms.map((room) => (
                                <div key={room.id} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between transition-all hover:bg-slate-900/60 hover:border-white/10 group">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase text-rose-500 px-2 py-0.5 bg-rose-500/10 rounded-md">
                                                {room.gameType}
                                            </span>
                                            <span className="text-sm font-bold text-white/90">#{room.id.split('-')[1]}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                            {room.playerCount} PLAYERS • {room.status}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => joinRoom(room.id, room.gameType)}
                                        disabled={room.status !== 'waiting'}
                                        className="bg-white/10 hover:bg-rose-600 hover:text-white text-white/80 px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-30 disabled:hover:bg-white/10"
                                    >
                                        JOIN
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Lobby;
