import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';

/* Pages */
import NeuralAuth from './pages/NeuralAuth';
import ExtractionTerminal from './pages/ExtractionTerminal';
import AssessmentEngine from './pages/AssessmentEngine';
import HolographicVerification from './pages/HolographicVerification';
import RecruiterHub from './pages/RecruiterHub';
import CandidateDetail from './pages/CandidateDetail';

/* Layout */
import CandidateNavbar from './components/CandidateNavbar';

/* ─── Protected Route ─────────────────────────────────────────── */
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading...</span>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return user.role === 'Recruiter' ? <Navigate to="/recruiter" replace /> : <Navigate to="/dashboard" replace />;
  }
  return children;
};

/* ─── Candidate Layout (Navbar + Page) ───────────────────────── */
const CandidateLayout = ({ children }) => (
  <>
    <CandidateNavbar />
    {children}
  </>
);

/* ─── App ─────────────────────────────────────────────────────── */
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<NeuralAuth />} />
          <Route path="/register" element={<NeuralAuth />} />

          {/* Candidate Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="Candidate">
                <CandidateLayout>
                  <ExtractionTerminal />
                </CandidateLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessment/:profileId"
            element={
              <ProtectedRoute requiredRole="Candidate">
                <CandidateLayout>
                  <AssessmentEngine />
                </CandidateLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/verification"
            element={
              <ProtectedRoute requiredRole="Candidate">
                <CandidateLayout>
                  <HolographicVerification />
                </CandidateLayout>
              </ProtectedRoute>
            }
          />

          {/* Recruiter Routes */}
          <Route
            path="/recruiter"
            element={
              <ProtectedRoute requiredRole="Recruiter">
                <RecruiterHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/candidate/:id"
            element={
              <ProtectedRoute requiredRole="Recruiter">
                <CandidateDetail />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
