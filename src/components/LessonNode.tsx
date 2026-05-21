import { useStore } from '../store/useStore';
import type { Lesson, Unit } from '../types';

interface Props {
  lesson: Lesson;
  unit: Unit;
  position: 'left' | 'center' | 'right';
  isLocked: boolean;
  isCompleted: boolean;
  isNext: boolean;
}

export function LessonNode({ lesson, unit, position, isLocked, isCompleted, isNext }: Props) {
  const { startQuiz } = useStore();

  const positionClass = {
    left: 'mr-auto ml-8',
    center: 'mx-auto',
    right: 'ml-auto mr-8',
  }[position];

  const handleClick = () => {
    if (!isLocked) startQuiz(lesson.id);
  };

  const nodeColor = isLocked
    ? 'bg-gray-300 border-gray-400'
    : isCompleted
    ? `${unit.darkColor} border-transparent`
    : `${unit.color} border-transparent`;

  return (
    <div className={`relative flex flex-col items-center ${positionClass} w-20`}>
      {/* Tooltip / label */}
      {isNext && !isLocked && (
        <div
          className={`absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
            ${unit.color} text-white text-xs font-bold px-2 py-1 rounded-full shadow-md
            animate-bounce`}
        >
          START
        </div>
      )}

      {/* Node button */}
      <button
        onClick={handleClick}
        disabled={isLocked}
        className={`relative w-16 h-16 rounded-full border-4 flex items-center justify-center
          text-2xl shadow-lg transition-transform
          ${nodeColor}
          ${!isLocked ? 'hover:scale-110 active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-60'}
          ${isNext ? 'ring-4 ring-offset-2 ring-white shadow-xl' : ''}
        `}
        aria-label={lesson.title}
        title={lesson.title}
      >
        {isLocked ? (
          <span className="text-gray-400 text-xl">🔒</span>
        ) : isCompleted ? (
          <span>{lesson.emoji}</span>
        ) : (
          <span>{lesson.emoji}</span>
        )}

        {/* Completed checkmark badge */}
        {isCompleted && (
          <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full
            flex items-center justify-center text-xs font-bold shadow border-2 border-white">
            ✓
          </span>
        )}

        {/* Pulse ring for next lesson */}
        {isNext && !isLocked && (
          <span className="absolute inset-0 rounded-full animate-pulse-ring border-4 border-white/60" />
        )}
      </button>

      {/* Lesson title */}
      <p className={`mt-2 text-center text-xs font-semibold leading-tight max-w-[80px]
        ${isLocked ? 'text-gray-400' : 'text-gray-700'}`}>
        {lesson.title}
      </p>

      {/* XP badge */}
      {!isLocked && (
        <span className={`mt-1 text-xs font-bold px-2 py-0.5 rounded-full
          ${isCompleted ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
          {isCompleted ? '✓' : '+'}{lesson.xpReward} XP
        </span>
      )}
    </div>
  );
}
