import { units } from '../data/curriculum';
import { useStore } from '../store/useStore';
import { UnitBanner, isUnitUnlocked } from './UnitBanner';
import { LessonNode } from './LessonNode';

const zigzag: Array<'left' | 'center' | 'right'> = ['center', 'right', 'center', 'left', 'center', 'right'];

export function SkillTree() {
  const { stats } = useStore();

  return (
    <div className="max-w-2xl mx-auto px-4 pt-20 pb-24 space-y-8">
      {units.map((unit, unitIndex) => {
        const unlocked = isUnitUnlocked(unitIndex, stats.completedLessons);
        const firstIncompleteIndex = unit.lessons.findIndex(
          (l) => !stats.completedLessons.includes(l.id)
        );

        return (
          <div key={unit.id}>
            <UnitBanner unit={unit} unitIndex={unitIndex} />

            <div className="mt-6 flex flex-col items-center gap-0">
              {unit.lessons.map((lesson, lessonIndex) => {
                const isCompleted = stats.completedLessons.includes(lesson.id);
                const isFirst = lessonIndex === 0;
                const prevCompleted =
                  lessonIndex === 0 || stats.completedLessons.includes(unit.lessons[lessonIndex - 1].id);
                const isLocked = !unlocked || (!isCompleted && !prevCompleted && lessonIndex > 0);
                const isNext = unlocked && lessonIndex === firstIncompleteIndex;

                const position = zigzag[lessonIndex % zigzag.length];

                return (
                  <div key={lesson.id} className="flex flex-col items-center w-full">
                    {/* Connector line (except for first in unit) */}
                    {!isFirst && (
                      <div
                        className={`h-8 path-connector ${
                          isCompleted || prevCompleted ? unit.textColor : 'text-gray-300'
                        }`}
                        style={{
                          marginLeft: position === 'left' ? '80px' : position === 'right' ? 'calc(100% - 80px - 3px)' : 'calc(50% - 1.5px)',
                          width: '3px',
                        }}
                      />
                    )}
                    <LessonNode
                      lesson={lesson}
                      unit={unit}
                      position={position}
                      isLocked={isLocked}
                      isCompleted={isCompleted}
                      isNext={isNext}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">🎓</div>
        <p className="text-sm font-medium">You've reached the end of Class 12 Physics!</p>
        <p className="text-xs mt-1">Keep practicing to improve your score</p>
      </div>
    </div>
  );
}
