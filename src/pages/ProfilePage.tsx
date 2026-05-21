import { useStore } from '../store/useStore';
import { units } from '../data/curriculum';
import type { UserStats } from '../types';

const achievements = [
  { id: 'first-lesson', emoji: '🌱', title: 'First Step', desc: 'Complete your first lesson', check: (s: UserStats) => s.completedLessons.length >= 1 },
  { id: 'five-lessons', emoji: '🔥', title: 'On Fire', desc: 'Complete 5 lessons', check: (s: UserStats) => s.completedLessons.length >= 5 },
  { id: 'ten-lessons', emoji: '💪', title: 'Dedicated', desc: 'Complete 10 lessons', check: (s: UserStats) => s.completedLessons.length >= 10 },
  { id: 'all-units', emoji: '🏆', title: 'Physics Master', desc: 'Complete all units', check: (s: UserStats) => s.completedLessons.length >= units.reduce((acc, u) => acc + u.lessons.length, 0) },
  { id: 'streak-7', emoji: '📅', title: 'Week Warrior', desc: '7-day streak', check: (s: UserStats) => s.streak >= 7 },
  { id: 'accuracy-90', emoji: '🎯', title: 'Sharp Mind', desc: '90%+ accuracy over 20 questions', check: (s: UserStats) => s.totalAnswered >= 20 && s.totalCorrect / s.totalAnswered >= 0.9 },
  { id: 'xp-200', emoji: '⭐', title: 'XP Collector', desc: 'Earn 200 XP', check: (s: UserStats) => s.xp >= 200 },
  { id: 'electrostatics-done', emoji: '⚡', title: 'Electrostatics Pro', desc: 'Complete the Electrostatics unit', check: (s: UserStats) => units[0].lessons.every((l) => s.completedLessons.includes(l.id)) },
];

export function ProfilePage() {
  const { stats, refillHearts } = useStore();

  const totalLessons = units.reduce((acc, u) => acc + u.lessons.length, 0);
  const accuracy = stats.totalAnswered > 0
    ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
    : 0;
  const overallProgress = Math.round((stats.completedLessons.length / totalLessons) * 100);

  const xpToNextLevel = 100;
  const currentLevelXP = stats.xp % xpToNextLevel;
  const level = Math.floor(stats.xp / xpToNextLevel) + 1;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-20 pb-24 space-y-6">
      {/* Profile hero */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white text-center shadow-xl">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center
          text-4xl mx-auto mb-3 border-4 border-white/40">
          🧑‍🔬
        </div>
        <h1 className="text-2xl font-extrabold">Physics Learner</h1>
        <p className="text-indigo-200 text-sm mt-1">Level {level} • {stats.xp} XP total</p>

        {/* XP Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-indigo-200 mb-1">
            <span>Level {level}</span>
            <span>{currentLevelXP}/{xpToNextLevel} XP</span>
            <span>Level {level + 1}</span>
          </div>
          <div className="bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-yellow-400 h-3 rounded-full xp-bar-fill"
              style={{ width: `${(currentLevelXP / xpToNextLevel) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard emoji="🔥" label="Day Streak" value={stats.streak.toString()} sub="days in a row" color="from-orange-400 to-red-500" />
        <StatCard emoji="❤️" label="Hearts" value={`${stats.hearts}/${stats.maxHearts}`} sub="remaining" color="from-red-400 to-pink-500" />
        <StatCard emoji="🎯" label="Accuracy" value={`${accuracy}%`} sub={`${stats.totalCorrect}/${stats.totalAnswered} correct`} color="from-blue-400 to-indigo-500" />
        <StatCard emoji="📚" label="Lessons Done" value={`${stats.completedLessons.length}/${totalLessons}`} sub={`${overallProgress}% complete`} color="from-green-400 to-teal-500" />
      </div>

      {/* Heart refill */}
      {stats.hearts < stats.maxHearts && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-red-700">Running low on hearts!</p>
            <p className="text-sm text-red-500">Practice to keep learning</p>
          </div>
          <button
            onClick={refillHearts}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl
              transition-colors active:scale-95 text-sm"
          >
            Refill ❤️
          </button>
        </div>
      )}

      {/* Unit progress */}
      <div>
        <h2 className="text-lg font-extrabold text-gray-800 mb-3">Unit Progress</h2>
        <div className="space-y-3">
          {units.map((unit, i) => {
            const done = unit.lessons.filter((l) => stats.completedLessons.includes(l.id)).length;
            const pct = Math.round((done / unit.lessons.length) * 100);
            return (
              <div key={unit.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{unit.lessons[0]?.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">Unit {i + 1}: {unit.title}</p>
                      <p className="text-xs text-gray-500">{done}/{unit.lessons.length} lessons</p>
                    </div>
                  </div>
                  <span className={`text-sm font-extrabold ${unit.textColor}`}>{pct}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${unit.color} h-2 rounded-full xp-bar-fill`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h2 className="text-lg font-extrabold text-gray-800 mb-3">Achievements</h2>
        <div className="grid grid-cols-2 gap-3">
          {achievements.map((ach) => {
            const earned = ach.check(stats);
            return (
              <div
                key={ach.id}
                className={`rounded-2xl p-4 border-2 transition-all ${
                  earned
                    ? 'bg-yellow-50 border-yellow-300 shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className={`text-3xl mb-1 ${!earned ? 'grayscale' : ''}`}>{ach.emoji}</div>
                <p className={`font-bold text-sm ${earned ? 'text-gray-800' : 'text-gray-500'}`}>
                  {ach.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{ach.desc}</p>
                {earned && <span className="text-xs text-yellow-600 font-bold">✓ Earned!</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  emoji,
  label,
  value,
  sub,
  color,
}: {
  emoji: string;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-md`}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs font-semibold opacity-80">{label}</div>
      <div className="text-xs opacity-60 mt-0.5">{sub}</div>
    </div>
  );
}
