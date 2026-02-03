import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, Users, Star, ArrowRight } from 'lucide-react';

const Home = ({ onSelectGame }) => {
    const { user, loginAsGuest } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [tempGame, setTempGame] = useState(null);
    const [guestName, setGuestName] = useState('');

    const games = [
        { id: 'bingo', name: 'BINGO', icon: <Star className="text-rose-500" />, desc: 'Classic luck & speed challenge' },
        { id: 'wordsearch', name: 'WORD FIND', icon: <Users className="text-blue-500" />, desc: 'Test your eyes in this puzzle race' }
    ];

    const handleGameClick = (game) => {
        if (user) {
            onSelectGame(game);
        } else {
            setTempGame(game);
            setShowAuthModal(true);
        }
    };

    const handleGuestSubmit = (e) => {
        e.preventDefault();
        loginAsGuest(guestName).then(() => {
            setShowAuthModal(false);
            onSelectGame(tempGame);
        });
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-10 md:space-y-16">
            <div className="text-center space-y-2 md:space-y-4">
                <h1 className="text-4xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40 leading-tight">
                    BATTLE ARENA
                </h1>
                <p className="text-[10px] md:text-slate-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-500">Choose your challenge</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-8">
                {games.map(game => (
                    <div
                        key={game.id}
                        onClick={() => handleGameClick(game.id)}
                        className="glass p-5 md:p-10 rounded-3xl md:rounded-[3rem] border-white/5 space-y-4 md:space-y-8 cursor-pointer group hover:-translate-y-2 md:hover:-translate-y-4 transition-all duration-500 hover:border-rose-500/30"
                    >
                        <div className="flex justify-between items-start">
                            <div className="p-3 md:p-5 bg-white/5 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-500">
                                {React.cloneElement(game.icon, {
                                    size: typeof window !== 'undefined' && window.innerWidth < 768 ? 24 : 40
                                })}
                            </div>
                            <div className="p-2 md:p-3 bg-white/5 rounded-full text-slate-500 group-hover:text-white transition-colors">
                                <ArrowRight size={16} className="md:w-5 md:h-5" />
                            </div>
                        </div>
                        <div className="space-y-1 md:space-y-2">
                            <h2 className="text-xl md:text-4xl font-black">{game.name}</h2>
                            <p className="text-[10px] md:text-base text-slate-500 font-medium line-clamp-2 md:line-clamp-none">{game.desc}</p>
                        </div>
                        <div className="pt-2 md:pt-4 flex flex-wrap gap-2 md:gap-3">
                            <span className="text-[8px] md:text-[10px] font-black bg-rose-500/10 text-rose-500 px-2 md:px-3 py-1 rounded-full uppercase">Multiplayer</span>
                            <span className="text-[8px] md:text-[10px] font-black bg-blue-500/10 text-blue-500 px-2 md:px-3 py-1 rounded-full uppercase">Real-time</span>
                        </div>
                    </div>
                ))}
            </div>


            {showAuthModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[90] backdrop-blur-md px-4 py-8">
                    <div className="glass p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] w-full max-w-md border-white/10 shadow-3xl animate-in zoom-in-95 duration-300 max-h-full overflow-y-auto">
                        <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight uppercase">Identity Required</h2>
                        <p className="text-sm md:text-base text-slate-400 mb-6 md:mb-8 font-medium">You need a name to enter the battlefield.</p>

                        <div className="space-y-4 md:space-y-6">
                            <button className="w-full btn-primary py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-3 text-sm md:text-base">
                                <Star size={18} className="md:w-5 md:h-5" />
                                CONTINUE WITH EMAIL
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                                <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#1a1a2e] px-4 text-slate-600 font-bold">OR QUICK GUEST</span></div>
                            </div>

                            <form onSubmit={handleGuestSubmit} className="space-y-3 md:space-y-4">
                                <input
                                    type="text"
                                    placeholder="Enter Nickname"
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-5 md:px-6 focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm md:text-base"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    required
                                />
                                <button type="submit" className="w-full btn-secondary py-3 md:py-4 rounded-xl md:rounded-2xl border border-white/5 hover:bg-slate-700 text-sm md:text-base font-bold">
                                    PLAY AS GUEST
                                </button>
                            </form>
                        </div>

                        <button
                            onClick={() => setShowAuthModal(false)}
                            className="w-full mt-6 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            )}


        </div>
    );
};

export default Home;
