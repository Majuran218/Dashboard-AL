// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/common/PrivateRoute';
import Header from './components/common/Header';
import Footer from './components/common/Footer';

// Pages
import HomePage from './pages/HomePage';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import StudentDashboard from './components/dashboard/StudentDashboard';
import StreamSubjects from './components/streams/Streamselector';
import PastPapers from './components/pastpapers/PastPapers';
import MCQSection from './components/mcq/MCQSection';
import VideoLibrary from './components/videos/VideoLibrary';
import NotesLibrary from './components/notes/NotesLibrary';
import StudyPlanner from './components/studyplanner/StudyPlanner';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <ThemeProvider>
            <div className="app">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={
                    <PrivateRoute>
                      <StudentDashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/streams/:streamId" element={
                    <PrivateRoute>
                      <StreamSubjects />
                    </PrivateRoute>
                  } />
                  <Route path="/pastpapers" element={
                    <PrivateRoute>
                      <PastPapers />
                    </PrivateRoute>
                  } />
                  <Route path="/mcq" element={
                    <PrivateRoute>
                      <MCQSection />
                    </PrivateRoute>
                  } />
                  <Route path="/videos" element={
                    <PrivateRoute>
                      <VideoLibrary />
                    </PrivateRoute>
                  } />
                  <Route path="/notes" element={
                    <PrivateRoute>
                      <NotesLibrary />
                    </PrivateRoute>
                  } />
                  <Route path="/study-planner" element={
                    <PrivateRoute>
                      <StudyPlanner />
                    </PrivateRoute>
                  } />
                  
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
              <Footer />
              <ToastContainer position="top-right" autoClose={3000} />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;