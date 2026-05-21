export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  emoji: string;
  questions: Question[];
  xpReward: number;
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  color: string;
  darkColor: string;
  textColor: string;
  borderColor: string;
  lessons: Lesson[];
}

export type View = 'home' | 'profile';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  completedLessons: string[];
  xp: number;
  streak: number;
  lastActiveDate: string;
  hearts: number;
  maxHearts: number;
  totalCorrect: number;
  totalAnswered: number;
  lessonsStarted: number;
}
