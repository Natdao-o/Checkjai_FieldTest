import { Navigate, Route, Routes } from 'react-router-dom'
import { StudentProvider } from './context/StudentContext'
import StudentGuard from './components/StudentGuard'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import QuizPage from './pages/QuizPage'
import QuizQuestionPage from './pages/QuizQuestionPage'
import DassQuestionPage from './pages/DassQuestionPage'
import ProfilePage from './pages/ProfilePage'
import CategoriesPage from './pages/CategoriesPage'
import BubbleLetterWritePage from './pages/BubbleLetterWritePage'
import BubbleLetterComfortPage from './pages/BubbleLetterComfortPage'
import HealingChoicePage from './pages/HealingChoicePage'
import HealingMusicPage from './pages/HealingMusicPage'
import HealingArtPage from './pages/HealingArtPage'
import PostcardPage from './pages/PostcardPage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <StudentProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes for Identified Students */}
        <Route
          path="/quiz"
          element={
            <StudentGuard>
              <QuizPage />
            </StudentGuard>
          }
        />
        <Route
          path="/quiz/question"
          element={
            <StudentGuard>
              <QuizQuestionPage />
            </StudentGuard>
          }
        />
        <Route
          path="/quiz/dass"
          element={
            <StudentGuard>
              <DassQuestionPage />
            </StudentGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <StudentGuard>
              <ProfilePage />
            </StudentGuard>
          }
        />
        <Route
          path="/categories"
          element={
            <StudentGuard>
              <CategoriesPage />
            </StudentGuard>
          }
        />
        <Route
          path="/bubble-letter/write"
          element={
            <StudentGuard>
              <BubbleLetterWritePage />
            </StudentGuard>
          }
        />
        <Route
          path="/bubble-letter/comfort"
          element={
            <StudentGuard>
              <BubbleLetterComfortPage />
            </StudentGuard>
          }
        />
        <Route
          path="/healing/choice"
          element={
            <StudentGuard>
              <HealingChoicePage />
            </StudentGuard>
          }
        />
        <Route
          path="/healing/music"
          element={
            <StudentGuard>
              <HealingMusicPage />
            </StudentGuard>
          }
        />
        <Route
          path="/healing/art"
          element={
            <StudentGuard>
              <HealingArtPage />
            </StudentGuard>
          }
        />
        <Route
          path="/postcard"
          element={
            <StudentGuard>
              <PostcardPage />
            </StudentGuard>
          }
        />
        <Route
          path="/history"
          element={
            <StudentGuard>
              <HistoryPage />
            </StudentGuard>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StudentProvider>
  )
}
