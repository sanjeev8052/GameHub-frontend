import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import Home from './pages/Home';
import Bingo from './components/Bingo';
import WordSearch from './components/WordSearch';
import { Gamepad2, User as UserIcon } from 'lucide-react';

// Simplified Bingo Selection Internal Component
const BingoLobby = ({ onBack }) => {
  const { socket } = useSocket();
  const [view, setView] = useState('main'); // main, private, joining

  const joinMatchmaking = (count) => {
    socket.emit('join-queue', { gameType: 'bingo', playerCount: count });
    setView('waiting');
  };

  return (
    <div className="max-w-4xl mx-auto py-10 md:py-20 px-4 md:px-6 space-y-10 md:space-y-12">
      <button onClick={onBack} className="text-slate-500 hover:text-white flex items-center gap-2 font-bold mb-4 md:mb-8 text-sm md:text-base">
        &larr; BACK TO GAMES
      </button>

      {view === 'main' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="glass p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] border-white/5 space-y-6 md:space-y-8 flex flex-col">
            <h3 className="text-2xl md:text-3xl font-black">QUICK MATCH</h3>
            <p className="text-sm md:text-base text-slate-500 font-medium">Jump into a lobby with random players.</p>
            <div className="flex gap-3 md:gap-4 mt-auto">
              <button onClick={() => joinMatchmaking(2)} className="flex-1 btn-primary py-3 md:py-4 text-sm md:text-base">2 PLAYER</button>
              <button onClick={() => joinMatchmaking(3)} className="flex-1 btn-primary py-3 md:py-4 text-sm md:text-base">3 PLAYER</button>
            </div>
          </div>

          <div className="glass p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] border-blue-500/20 space-y-6 md:space-y-8 flex flex-col">
            <h3 className="text-2xl md:text-3xl font-black text-blue-400">FRIENDS</h3>
            <p className="text-sm md:text-base text-slate-500 font-medium">Invite your squad to a private arena.</p>
            <div className="flex flex-col gap-3 md:gap-4 mt-auto">
              <button
                onClick={() => socket.emit('create-private-room', { gameType: 'bingo' })}
                className="w-full btn-secondary py-3 md:py-4 text-sm md:text-base"
              >
                HOST PRIVATE GAME
              </button>
              <button onClick={() => setView('joining')} className="w-full bg-white/5 py-3 md:py-4 rounded-full font-bold text-sm md:text-base">
                ENTER INVITE CODE
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'joining' && (
        <JoinPrivate onCancel={() => setView('main')} />
      )}

      {view === 'waiting' && (
        <div className="flex flex-col items-center justify-center py-12 md:py-20 space-y-6 md:space-y-8">
          <div className="relative">
            <div className="w-16 h-16 md:w-24 md:h-24 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
          </div>
          <div className="text-center space-y-1 md:space-y-2">
            <h3 className="text-xl md:text-2xl font-black italic">MATCHMAKING...</h3>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">Searching for opponents</p>
          </div>
          <button onClick={() => setView('main')} className="text-slate-600 font-bold hover:text-white transition-colors text-xs md:text-sm">CANCEL QUEUE</button>
        </div>
      )}
    </div>
  );
};

const JoinPrivate = ({ onCancel }) => {
  const { socket } = useSocket();
  const [code, setCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim()) {
      socket.emit('join-private-room', { inviteCode: code });
    }
  };

  return (
    <div className="glass p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] max-w-md mx-auto space-y-6 md:space-y-8 border-white/10 shadow-3xl">
      <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-blue-400">Join Arena</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="ENTER CODE"
          className="w-full bg-slate-900/50 border border-white/10 rounded-xl md:rounded-2xl py-4 md:py-5 px-5 md:px-6 text-xl md:text-2xl font-black text-center tracking-widest outline-none focus:ring-2 focus:ring-blue-500"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button type="submit" className="w-full btn-primary bg-blue-600 hover:bg-blue-500 py-3 md:py-4 shadow-blue-600/20 text-sm md:text-base">
          ENTER BATTLE
        </button>
      </form>
      <button onClick={onCancel} className="w-full text-slate-600 font-bold text-[10px] md:text-xs uppercase tracking-widest">CANCEL</button>
    </div>
  );
};


const AppContent = () => {
  const { socket } = useSocket();
  const { user, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('home'); // home, bingo, wordsearch, matchmaking, private_lobby
  const [gameData, setGameData] = useState(null);

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('join-lobby', { username: user.username, name: user.name });

    socket.on('game-joined', (data) => {
      setGameData(data);
      setCurrentScreen('game');
    });

    socket.on('error', (msg) => {
      alert(msg);
    });

    return () => {
      socket.off('game-joined');
      socket.off('error');
    };
  }, [socket, user]);

  return (
    <div className="min-h-screen flex flex-col">
      {currentScreen !== 'game' && (
        <nav className="border-b border-white/5 py-4 px-4 md:px-8 flex justify-between items-center glass sticky top-0 z-[100] shrink-0 gap-2">
          <div
            className="flex items-center gap-2 md:gap-3 cursor-pointer shrink-0"
            onClick={() => { setCurrentScreen('home'); setGameData(null); }}
          >
            <div className="p-2 bg-rose-600 rounded-lg md:rounded-xl shadow-lg shadow-rose-600/20 text-white">
              <Gamepad2 size={18} className="md:w-6 md:h-6" />
            </div>
            <span className="text-lg md:text-2xl font-black tracking-tighter">GAMEHUB</span>
          </div>

          {user && (
            <div className="flex items-center gap-2 md:gap-6 ml-auto">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase hidden md:block">Authenticated</p>
                  <p className="text-xs md:text-sm font-bold text-rose-500 truncate max-w-[80px] md:max-w-none">{user.name}</p>
                </div>
                <div className="p-1.5 md:p-2 bg-white/5 rounded-lg md:rounded-xl text-slate-400">
                  <UserIcon size={16} className="md:w-5 md:h-5" />
                </div>
              </div>
              <button
                onClick={logout}
                className="text-[8px] md:text-[10px] font-black bg-white/5 hover:bg-rose-500/10 px-2.5 md:px-4 py-1.5 md:py-2 rounded-full border border-white/5 transition-all shrink-0"
              >
                LOGOUT
              </button>
            </div>
          )}
        </nav>

      )}

      <main className="flex-1">
        {currentScreen === 'home' && (
          <Home onSelectGame={(id) => setCurrentScreen(id === 'bingo' ? 'bingo_lobby' : id)} />
        )}

        {currentScreen === 'bingo_lobby' && (
          <BingoLobby onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'game' && gameData && (
          <div className="animate-in fade-in duration-500">
            {gameData.gameType === 'bingo' && (
              <Bingo
                gameId={gameData.gameId}
                inviteCode={gameData.inviteCode}
                initialPlayers={gameData.players}
                initialMaxNumber={gameData.maxNumber || 75}
                initialIsSetup={gameData.isSetup}
              />
            )}
            {gameData.gameType === 'wordsearch' && (
              <WordSearch
                gameId={gameData.gameId}
                initialSize={gameData.size}
              />
            )}
          </div>
        )}
      </main>

      <footer className="py-8 text-center">
        <p className="text-slate-600 text-[10px] font-bold tracking-[0.2em] uppercase">
          &copy; 2026 Crafted for the Competitive Player
        </p>
      </footer>
    </div>
  );
};


function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
