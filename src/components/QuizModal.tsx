import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { units } from '../data/curriculum';
import type { Question, Lesson } from '../types';

function findLesson(lessonId: string): Lesson | null {
  for (const unit of units) {
    const lesson = unit.lessons.find((l) => l.id === lessonId);
    if (lesson) return lesson;
  }
  return null;
}

type AnswerState = 'idle' | 'correct' | 'wrong';

export function QuizModal() {
  const { activeQuizLessonId, closeQuiz, completeLesson, stats } = useStore();

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [heartsLost, setHeartsLost] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const lesson = activeQuizLessonId ? findLesson(activeQuizLessonId) : null;

  useEffect(() => {
    setQuestionIndex(0);
    setSelectedOption(null);
    setAnswerState('idle');
    setHeartsLost(0);
    setCorrectCount(0);
    setIsComplete(false);
    setShowExplanation(false);
  }, [activeQuizLessonId]);

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (!lesson || answerState !== 'idle') return;

      const question: Question = lesson.questions[questionIndex];
      const isCorrect = optionIndex === question.correctIndex;

      setSelectedOption(optionIndex);
      setAnswerState(isCorrect ? 'correct' : 'wrong');
      setShowExplanation(true);

      if (isCorrect) {
        setCorrectCount((c) => c + 1);
      } else {
        setHeartsLost((h) => h + 1);
      }
    },
    [lesson, answerState, questionIndex]
  );

  const handleContinue = useCallback(() => {
    if (!lesson) return;

    if (questionIndex + 1 >= lesson.questions.length) {
      setIsComplete(true);
    } else {
      setQuestionIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswerState('idle');
      setShowExplanation(false);
    }
  }, [lesson, questionIndex]);

  const handleFinish = useCallback(() => {
    if (!lesson) return;
    completeLesson(
      lesson.id,
      lesson.xpReward,
      correctCount,
      lesson.questions.length,
      heartsLost
    );
  }, [lesson, correctCount, heartsLost, completeLesson]);

  if (!activeQuizLessonId || !lesson) return null;

  const question = lesson.questions[questionIndex];
  const progress = ((questionIndex + (answerState !== 'idle' ? 1 : 0)) / lesson.questions.length) * 100;
  const currentHearts = Math.max(0, stats.hearts - heartsLost);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={closeQuiz}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Progress bar */}
        <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-indigo-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Hearts */}
        <div className="flex gap-1 ml-2">
          {Array.from({ length: stats.maxHearts }).map((_, i) => (
            <span key={i} className={`text-lg transition-all ${i < currentHearts ? 'opacity-100' : 'opacity-20'}`}>
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Lesson title */}
      <div className="px-4 py-2">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
          {lesson.emoji} {lesson.title}
        </p>
        <p className="text-xs text-gray-400">
          Question {questionIndex + 1} of {lesson.questions.length}
        </p>
      </div>

      {isComplete ? (
        <CompletionScreen
          lesson={lesson}
          correctCount={correctCount}
          heartsLost={heartsLost}
          onFinish={handleFinish}
        />
      ) : (
        <div className="flex-1 flex flex-col px-4 pb-4 overflow-y-auto">
          {/* Question */}
          <div className="flex-1 flex flex-col justify-center py-4">
            <h2 className="text-xl font-bold text-gray-800 leading-snug mb-6 animate-slide-up">
              {question.text}
            </h2>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {question.options.map((option, i) => {
                const isSelected = selectedOption === i;
                const isCorrectOption = i === question.correctIndex;
                let btnStyle = 'bg-white border-2 border-gray-200 text-gray-800 hover:border-indigo-300 hover:bg-indigo-50';

                if (answerState !== 'idle') {
                  if (isCorrectOption) {
                    btnStyle = 'bg-green-50 border-2 border-green-400 text-green-800';
                  } else if (isSelected && !isCorrectOption) {
                    btnStyle = 'bg-red-50 border-2 border-red-400 text-red-800 animate-shake';
                  } else {
                    btnStyle = 'bg-white border-2 border-gray-200 text-gray-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    disabled={answerState !== 'idle'}
                    className={`option-btn w-full text-left px-4 py-4 rounded-2xl font-semibold
                      transition-all shadow-sm ${btnStyle}`}
                  >
                    <span className="inline-block w-7 h-7 rounded-full bg-gray-100 text-gray-600
                      text-center text-sm mr-3 font-bold leading-7">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                    {answerState !== 'idle' && isCorrectOption && (
                      <span className="float-right text-green-500 font-bold">✓</span>
                    )}
                    {answerState !== 'idle' && isSelected && !isCorrectOption && (
                      <span className="float-right text-red-500 font-bold">✗</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Feedback banner */}
            {answerState !== 'idle' && (
              <div className={`mt-4 p-4 rounded-2xl animate-bounce-in ${
                answerState === 'correct'
                  ? 'bg-green-50 border-2 border-green-300'
                  : 'bg-red-50 border-2 border-red-300'
              }`}>
                <p className={`font-extrabold text-lg mb-1 ${
                  answerState === 'correct' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {answerState === 'correct' ? '🎉 Correct!' : '❌ Not quite!'}
                </p>
                {showExplanation && (
                  <p className="text-sm text-gray-700 leading-relaxed">{question.explanation}</p>
                )}
              </div>
            )}
          </div>

          {/* Continue button */}
          {answerState !== 'idle' && (
            <button
              onClick={handleContinue}
              className={`w-full py-4 rounded-2xl font-extrabold text-lg text-white
                shadow-lg transition-transform active:scale-95
                ${answerState === 'correct' ? 'bg-green-500 hover:bg-green-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
            >
              {questionIndex + 1 >= lesson.questions.length ? 'See Results →' : 'Continue →'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface CompletionProps {
  lesson: Lesson;
  correctCount: number;
  heartsLost: number;
  onFinish: () => void;
}

function CompletionScreen({ lesson, correctCount, heartsLost, onFinish }: CompletionProps) {
  const total = lesson.questions.length;
  const accuracy = Math.round((correctCount / total) * 100);
  const xpEarned = lesson.xpReward;
  const perfect = correctCount === total;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 text-center animate-celebration">
      {/* Trophy */}
      <div className="text-8xl mb-4">
        {perfect ? '🏆' : accuracy >= 60 ? '🌟' : '📚'}
      </div>

      <h2 className="text-3xl font-extrabold text-gray-800 mb-1">
        {perfect ? 'Perfect!' : accuracy >= 60 ? 'Well Done!' : 'Keep Practicing!'}
      </h2>
      <p className="text-gray-500 mb-8">{lesson.title}</p>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
        <StatCard emoji="⭐" label="XP Earned" value={`+${xpEarned}`} color="text-yellow-500" />
        <StatCard emoji="✓" label="Correct" value={`${correctCount}/${total}`} color="text-green-500" />
        <StatCard emoji="🎯" label="Accuracy" value={`${accuracy}%`} color="text-indigo-500" />
      </div>

      {heartsLost > 0 && (
        <p className="text-sm text-red-400 mb-4">
          -{heartsLost} ❤️ lost this round
        </p>
      )}

      <button
        onClick={onFinish}
        className="w-full max-w-sm py-4 bg-indigo-500 hover:bg-indigo-600 active:scale-95
          text-white font-extrabold text-xl rounded-2xl shadow-lg transition-all"
      >
        Continue Learning! 🚀
      </button>
    </div>
  );
}

function StatCard({
  emoji,
  label,
  value,
  color,
}: {
  emoji: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-gray-50 rounded-2xl p-3 border-2 border-gray-100">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className={`text-xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
