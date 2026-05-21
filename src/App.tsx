import { useStore } from './store/useStore';
import { Header } from './components/Header';
import { SkillTree } from './components/SkillTree';
import { QuizModal } from './components/QuizModal';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  const { currentView, activeQuizLessonId } = useStore();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main>
        {currentView === 'home' && <SkillTree />}
        {currentView === 'profile' && <ProfilePage />}
      </main>

      {activeQuizLessonId && <QuizModal />}
    </div>
  );
}
