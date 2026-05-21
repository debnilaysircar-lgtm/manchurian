import type { Unit } from '../types';
import { useStore } from '../store/useStore';
import { units } from '../data/curriculum';

interface Props {
  unit: Unit;
  unitIndex: number;
}

function getUnitProgress(unit: Unit, completedLessons: string[]): number {
  const done = unit.lessons.filter((l) => completedLessons.includes(l.id)).length;
  return Math.round((done / unit.lessons.length) * 100);
}

function isUnitUnlocked(unitIndex: number, completedLessons: string[]): boolean {
  if (unitIndex === 0) return true;
  const prevUnit = units[unitIndex - 1];
  return prevUnit.lessons.every((l) => completedLessons.includes(l.id));
}

export function UnitBanner({ unit, unitIndex }: Props) {
  const { stats } = useStore();
  const progress = getUnitProgress(unit, stats.completedLessons);
  const unlocked = isUnitUnlocked(unitIndex, stats.completedLessons);

  return (
    <div className={`rounded-2xl p-4 mb-2 ${unlocked ? unit.color : 'bg-gray-400'} text-white`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Unit {unitIndex + 1}
          </p>
          <h2 className="text-lg font-extrabold">{unit.title}</h2>
          <p className="text-sm opacity-80">{unit.description}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black">{progress}%</div>
          <div className="text-xs opacity-80">complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white/30 rounded-full h-2 overflow-hidden">
        <div
          className="bg-white rounded-full h-2 xp-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!unlocked && (
        <div className="mt-2 text-center text-sm opacity-90">
          🔒 Complete previous unit to unlock
        </div>
      )}
    </div>
  );
}

export { isUnitUnlocked };
