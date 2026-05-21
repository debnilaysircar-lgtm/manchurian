import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserStats, View } from '../types';

interface StoreState {
  stats: UserStats;
  currentView: View;
  activeQuizLessonId: string | null;
  setView: (view: View) => void;
  startQuiz: (lessonId: string) => void;
  closeQuiz: () => void;
  completeLesson: (lessonId: string, xp: number, correct: number, total: number, heartsLost: number) => void;
  loseHeart: () => void;
  refillHearts: () => void;
  updateStreak: () => void;
}

const initialStats: UserStats = {
  completedLessons: [],
  xp: 0,
  streak: 0,
  lastActiveDate: '',
  hearts: 5,
  maxHearts: 5,
  totalCorrect: 0,
  totalAnswered: 0,
  lessonsStarted: 0,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      stats: initialStats,
      currentView: 'home',
      activeQuizLessonId: null,

      setView: (view) => set({ currentView: view }),

      startQuiz: (lessonId) => {
        get().updateStreak();
        set((state) => ({
          activeQuizLessonId: lessonId,
          stats: { ...state.stats, lessonsStarted: state.stats.lessonsStarted + 1 },
        }));
      },

      closeQuiz: () => set({ activeQuizLessonId: null }),

      completeLesson: (lessonId, xp, correct, total, heartsLost) =>
        set((state) => {
          const alreadyCompleted = state.stats.completedLessons.includes(lessonId);
          return {
            activeQuizLessonId: null,
            stats: {
              ...state.stats,
              completedLessons: alreadyCompleted
                ? state.stats.completedLessons
                : [...state.stats.completedLessons, lessonId],
              xp: state.stats.xp + (alreadyCompleted ? Math.floor(xp / 2) : xp),
              hearts: Math.max(0, state.stats.hearts - heartsLost),
              totalCorrect: state.stats.totalCorrect + correct,
              totalAnswered: state.stats.totalAnswered + total,
            },
          };
        }),

      loseHeart: () =>
        set((state) => ({
          stats: { ...state.stats, hearts: Math.max(0, state.stats.hearts - 1) },
        })),

      refillHearts: () =>
        set((state) => ({
          stats: { ...state.stats, hearts: state.stats.maxHearts },
        })),

      updateStreak: () =>
        set((state) => {
          const today = new Date().toDateString();
          const last = state.stats.lastActiveDate;
          if (last === today) return state;

          const yesterday = new Date(Date.now() - 86400000).toDateString();
          const newStreak = last === yesterday ? state.stats.streak + 1 : 1;
          return {
            stats: { ...state.stats, streak: newStreak, lastActiveDate: today },
          };
        }),
    }),
    {
      name: 'physics-quest-storage',
    }
  )
);
