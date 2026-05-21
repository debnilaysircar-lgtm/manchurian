import { useStore } from '../store/useStore';

export function Header() {
  const { stats, currentView, setView } = useStore();
  const accuracy = stats.totalAnswered > 0
    ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
    : 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b-2 border-gray-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-2 font-extrabold text-xl tracking-tight"
        >
          <span className="text-2xl">⚛️</span>
          <span className="text-slate-800">Physics<span className="text-indigo-500">Quest</span></span>
        </button>

        {/* Stats row */}
        <div className="flex items-center gap-4">
          {/* Streak */}
          <button
            onClick={() => setView('profile')}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <span className="text-orange-500 text-lg">🔥</span>
            <span className="font-bold text-gray-700 text-sm">{stats.streak}</span>
          </button>

          {/* Hearts */}
          <div className="flex items-center gap-1">
            <span className="text-red-500 text-lg">❤️</span>
            <span className="font-bold text-gray-700 text-sm">{stats.hearts}</span>
          </div>

          {/* XP */}
          <div className="flex items-center gap-1">
            <span className="text-yellow-500 text-lg">⭐</span>
            <span className="font-bold text-gray-700 text-sm">{stats.xp}</span>
          </div>

          {/* Profile nav */}
          <button
            onClick={() => setView(currentView === 'profile' ? 'home' : 'profile')}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              currentView === 'profile'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={`Accuracy: ${accuracy}%`}
          >
            {currentView === 'profile' ? '🏠' : '👤'}
          </button>
        </div>
      </div>
    </header>
  );
}
